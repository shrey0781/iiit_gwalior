import pandas as pd
import numpy as np
import pickle
import json
import sys
import warnings
warnings.filterwarnings('ignore')


def _allocate_emi_close_to_flat(total_outstanding, lower_bounds, upper_bounds, max_iter=2000):
    """
    Choose monthly EMIs with sum = total_outstanding and lb[i] <= x[i] <= ub[i].
    Iteratively rebalances toward equal payments so the schedule is smooth (unlike
    linprog with a zero objective, which picks a corner: min EMI most months, spikes
    at the end).
    """
    lb = np.asarray(lower_bounds, dtype=float)
    ub = np.asarray(upper_bounds, dtype=float)
    n = len(lb)
    if n == 0 or np.any(lb > ub + 1e-9):
        return None
    s_lb, s_ub = float(lb.sum()), float(ub.sum())
    if total_outstanding < s_lb - 1e-6 or total_outstanding > s_ub + 1e-6:
        return None

    target = total_outstanding / n
    x = np.clip(np.full(n, target), lb, ub)

    for _ in range(max_iter):
        diff = total_outstanding - float(x.sum())
        if abs(diff) < 1e-6:
            break
        if diff > 0:
            slack = ub - x
            mask = slack > 1e-12
            if not np.any(mask):
                return None
            x[mask] += diff * (slack[mask] / slack[mask].sum())
        else:
            slack = x - lb
            mask = slack > 1e-12
            if not np.any(mask):
                return None
            x[mask] += diff * (slack[mask] / slack[mask].sum())
        x = np.clip(x, lb, ub)
    else:
        if abs(float(x.sum()) - total_outstanding) > 1e-2 * max(abs(total_outstanding), 1.0):
            return None

    if abs(float(x.sum()) - total_outstanding) > 1e-4:
        return None

    s = np.round(x, 2)
    adj = round(float(total_outstanding), 2) - float(s.sum())
    if abs(adj) >= 0.005:
        for j in range(n - 1, -1, -1):
            newv = float(np.clip(round(s[j] + adj, 2), lb[j], ub[j]))
            adj -= newv - s[j]
            s[j] = newv
            if abs(adj) < 0.005:
                break
    if abs(float(s.sum()) - round(float(total_outstanding), 2)) > 0.05:
        return None
    return s


class EMIPlannerModel:
    """
    EMI Planner that integrates Model1 (Income Prediction) and Model2 (Risk Detection)
    to create optimal EMI schedules and financial reports
    """
    
    def __init__(self):
        """Initialize by loading model1 and model2"""
        try:
            self.model1 = pickle.load(open("model1_lgb.pkl", "rb"))
            self.model1_features = pickle.load(open("model1_features.pkl", "rb"))
        except Exception:
            self.model1 = None
            print("Warning: Model1 not loaded", file=sys.stderr)
        
        try:
            self.model2 = pickle.load(open("model2_catboost.pkl", "rb"))
            self.model2_features = pickle.load(open("model2_features.pkl", "rb"))
            self.model2_cat_features = pickle.load(open("model2_cat_features.pkl", "rb"))
        except Exception:
            self.model2 = None
            print("Warning: Model2 not loaded", file=sys.stderr)
    
    
    def predict_income(self, farmer_data):
        """
        Predict monthly income using Model1
        
        Args:
            farmer_data: dict with keys like 'actual_rainfall_mm', 'ndvi_value', etc.
        
        Returns:
            predicted_income: float
        """
        if self.model1 is None:
            return None
        
        try:
            input_df = pd.DataFrame([farmer_data])
            prediction = self.model1.predict(input_df)[0]
            return max(prediction, 0)  # Ensure non-negative
        except Exception as e:
            print(f"Income prediction error: {e}")
            return None
    
    
    def predict_default_risk(self, farmer_data):
        """
        Predict default risk within 12 months using Model2
        
        Args:
            farmer_data: dict with agricultural stress features
        
        Returns:
            risk_score: float (0-1 probability of default)
        """
        if self.model2 is None:
            return None
        
        try:
            row = dict(farmer_data)
            if self.model2_cat_features:
                for c in self.model2_cat_features:
                    if c in row:
                        row[c] = str(row[c])
            input_df = pd.DataFrame([row])
            risk_probability = self.model2.predict_proba(input_df)[0, 1]
            return risk_probability
        except Exception as e:
            print(f"Risk prediction error: {e}")
            return None
    
    
    def generate_monthly_forecast(self, num_months, 
                                  rainfall_data=None, 
                                  ndvi_data=None, 
                                  price_data=None,
                                  income_lag_data=None):
        """
        Generate predicted monthly income for next N months
        
        Args:
            num_months: int, number of months to forecast
            rainfall_data: array of rainfall for each month (optional, will be simulated if not provided)
            ndvi_data: array of NDVI values
            price_data: array of mandi prices
            income_lag_data: previous income values
        
        Returns:
            df_forecast: DataFrame with predictions
        """
        month_predictions = []
        
        if rainfall_data is None:
            rainfall_data = np.random.normal(100, 30, num_months)
        
        if ndvi_data is None:
            ndvi_data = np.random.uniform(0.3, 0.7, num_months)
        
        if price_data is None:
            price_data = np.random.normal(1500, 200, num_months)
        
        if income_lag_data is None:
            income_lag_data = np.array([15000, 14000])
        
        for i in range(num_months):
            rain_val = rainfall_data[i] if i < len(rainfall_data) else np.random.normal(100, 30)
            ndvi_val = ndvi_data[i] if i < len(ndvi_data) else np.random.uniform(0.3, 0.7)
            price_val = price_data[i] if i < len(price_data) else np.random.normal(1500, 200)
            price_shock = (price_val - np.mean(price_data)) / np.mean(price_data)
            
            income_lag1 = income_lag_data[-1] if len(income_lag_data) > 0 else 15000
            income_lag2 = income_lag_data[-2] if len(income_lag_data) > 1 else 14000
            
            feature_dict = {
                'actual_rainfall_mm': rain_val,
                'ndvi_value': ndvi_val,
                'kharif_mandi_price': price_val,
                'price_shock_pct': price_shock,
                'net_income_lag1': income_lag1,
                'net_income_lag2': income_lag2
            }
            
            predicted_income = self.predict_income(feature_dict)
            predicted_income = predicted_income if predicted_income else 15000 + np.random.normal(0, 2000)
            
            month_predictions.append({
                'month': i + 1,
                'rainfall_mm': rain_val,
                'ndvi_value': ndvi_val,
                'price_inr': price_val,
                'predicted_income_inr': predicted_income
            })
            
            income_lag_data = np.append(income_lag_data, predicted_income)[-2:]
        
        return pd.DataFrame(month_predictions)
    
    
    def calculate_risk_score(self, threshold_days=20):
        """
        Calculate overall risk score for farmer
        
        Returns:
            risk_score: float (0-100)
        """
        # Placeholder: will be calculated from model2 predictions
        return np.random.uniform(10, 80)
    
    
    def optimize_emi_schedule(self, predicted_incomes, total_outstanding, 
                            max_emi_pct=0.40, min_emi=500, risk_scores=None):
        """
        Optimize EMI schedule based on predicted incomes and risk
        
        Args:
            predicted_incomes: array of predicted monthly incomes
            total_outstanding: total debt amount
            max_emi_pct: max percentage of income for EMI (default 40%)
            min_emi: minimum EMI amount (default 500)
            risk_scores: array of default risk scores for each month
        
        Returns:
            status: "Optimal" or "Infeasible"
            schedule: array of optimized EMI for each month
            schedule_df: DataFrame with detailed schedule
        """
        num_months = len(predicted_incomes)
        
        # Adjust max EMI based on risk score
        if risk_scores is not None:
            adjusted_max_pct = []
            for i, risk in enumerate(risk_scores):
                # Higher risk = lower allowed EMI
                adj_pct = max_emi_pct * (1 - risk / 100 * 0.3)  # Risk reduces EMI capacity by 0-30%
                adjusted_max_pct.append(adj_pct)
        else:
            adjusted_max_pct = [max_emi_pct] * num_months
        
        lower = []
        upper = []
        incomes = np.asarray(predicted_incomes, dtype=float)
        for i, income in enumerate(incomes):
            max_capacity = max(min_emi, float(income) * adjusted_max_pct[i])
            lower.append(float(min_emi))
            upper.append(float(max_capacity))

        schedule = _allocate_emi_close_to_flat(float(total_outstanding), lower, upper)

        if schedule is not None:
            safe_income = np.maximum(incomes, 1.0)
            ratios = (schedule / safe_income * 100.0)
            schedule_df = pd.DataFrame({
                'month': range(1, num_months + 1),
                'predicted_income': incomes,
                'optimized_emi': schedule,
                'emi_to_income_ratio': np.round(ratios, 2),
                'remaining_income': np.round(incomes - schedule, 2),
                'risk_score': risk_scores if risk_scores is not None else [0] * num_months
            })
            return "Optimal", schedule, schedule_df
        return "Infeasible", None, None
    
    
    def generate_comprehensive_report(self, farmer_info, loan_amount, 
                                     num_months=12, rainfall_data=None, 
                                     ndvi_data=None, price_data=None):
        """
        Generate comprehensive EMI planning report
        
        Returns:
            report: dict with all analysis and recommendations
        """
        # Generate income forecast
        df_forecast = self.generate_monthly_forecast(
            num_months, rainfall_data, ndvi_data, price_data
        )
        
        # Calculate risk scores for each month
        risk_scores = []
        for idx, row in df_forecast.iterrows():
            risk_data = {
                'state': farmer_info.get('state', 'MP'),
                'district': farmer_info.get('district', 'Vidisha'),
                'primary_kharif_crop': farmer_info.get('crop', 'Wheat'),
                'irrigation_type': farmer_info.get('irrigation', 'Borewell'),
                'rainfall_deviation_pct': ((row['rainfall_mm'] - 100) / 100) * 100,
                'ndvi_stress_months': 3 if row['ndvi_value'] < 0.4 else 0,
                'drought_months_12m': 3 if row['rainfall_mm'] < 60 else 0,
                'kharif_msp_diff': row['price_inr'] - 1500,
                'net_income': float(row['predicted_income_inr']),
            }
            risk_score = self.predict_default_risk(risk_data) or np.random.uniform(0.1, 0.8)
            risk_scores.append(risk_score * 100)  # Convert to 0-100 scale
        
        # Optimize EMI
        status, schedule, schedule_df = self.optimize_emi_schedule(
            df_forecast['predicted_income_inr'].values,
            loan_amount,
            risk_scores=risk_scores
        )
        
        # Calculate statistics
        avg_income = df_forecast['predicted_income_inr'].mean()
        max_income = df_forecast['predicted_income_inr'].max()
        min_income = df_forecast['predicted_income_inr'].min()
        income_volatility = df_forecast['predicted_income_inr'].std()
        
        avg_risk = np.mean(risk_scores)
        max_risk = np.max(risk_scores)
        
        if status == "Optimal":
            avg_emi = schedule_df['optimized_emi'].mean()
            total_emi = schedule_df['optimized_emi'].sum()
            avg_ratio = schedule_df['emi_to_income_ratio'].mean()
        else:
            avg_emi = loan_amount / num_months
            total_emi = loan_amount
            avg_ratio = (avg_emi / avg_income) * 100
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            avg_income, avg_emi, avg_risk, income_volatility, schedule_df, status
        )
        
        report = {
            'status': 'success' if status == 'Optimal' else 'warning',
            'farmer_info': farmer_info,
            'loan_amount': loan_amount,
            'duration_months': num_months,
            'forecast': {
                'monthly_data': df_forecast.to_dict('records'),
                'avg_income': round(avg_income, 2),
                'max_income': round(max_income, 2),
                'min_income': round(min_income, 2),
                'income_std': round(income_volatility, 2)
            },
            'emi_schedule': {
                'status': status,
                'avg_emi': round(avg_emi, 2),
                'total_emi': round(total_emi, 2),
                'monthly_schedule': schedule_df.to_dict('records') if schedule_df is not None else []
            },
            'risk_analysis': {
                'avg_risk_score': round(avg_risk, 2),
                'max_risk_score': round(max_risk, 2),
                'risk_level': self._classify_risk(avg_risk)
            },
            'affordability': {
                'avg_emi_to_income_ratio': round(avg_ratio, 2),
                'affordability_level': self._classify_affordability(avg_ratio),
                'recommendation': 'Recommended' if avg_ratio < 40 else 'Caution: High burden'
            },
            'recommendations': recommendations
        }
        
        return report
    
    
    def _generate_recommendations(self, avg_income, avg_emi, avg_risk, 
                                  volatility, schedule_df, status):
        """Generate actionable recommendations"""
        recommendations = []
        
        if status == "Infeasible":
            recommendations.append({
                'type': 'critical',
                'message': 'Current loan amount may not be affordable. Consider reducing loan amount or extending duration.'
            })
        
        if avg_risk > 70:
            recommendations.append({
                'type': 'warning',
                'message': f'High risk detected (Score: {avg_risk:.1f}). Stress management recommended.'
            })
        
        if volatility > avg_income * 0.3:
            recommendations.append({
                'type': 'caution',
                'message': f'High income volatility detected. Build emergency fund for buffer months.'
            })
        
        if avg_emi / avg_income > 0.35:
            recommendations.append({
                'type': 'info',
                'message': 'Consider crop diversification to stabilize income.'
            })
        
        if schedule_df is not None:
            high_risk_months = schedule_df[schedule_df['risk_score'] > 70]
            if len(high_risk_months) > 0:
                recommendations.append({
                    'type': 'warning',
                    'message': f'{len(high_risk_months)} high-risk months detected. Plan buffer savings.'
                })
        
        if not recommendations:
            recommendations.append({
                'type': 'success',
                'message': 'EMI plan appears feasible with current income projections.'
            })
        
        return recommendations
    
    
    def _classify_risk(self, risk_score):
        """Classify risk level"""
        if risk_score < 30:
            return 'Low'
        elif risk_score < 60:
            return 'Medium'
        else:
            return 'High'
    
    
    def _classify_affordability(self, ratio):
        """Classify affordability level"""
        if ratio < 25:
            return 'Highly Affordable'
        elif ratio < 40:
            return 'Affordable'
        elif ratio < 50:
            return 'Manageable'
        else:
            return 'Challenging'


# ===== DEMO/USAGE =====
if __name__ == "__main__":
    print("="*60)
    print("EMI PLANNER - MODEL3 (Integrated with Model1 & Model2)")
    print("="*60)
    
    # Initialize planner
    planner = EMIPlannerModel()
    
    # Farmer information
    farmer_info = {
        'name': 'राज कुमार / Raj Kumar',
        'district': 'Vidisha',
        'state': 'MP',
        'crop': 'Wheat',
        'land_hectares': 2.5,
        'irrigation': 'Borewell'
    }
    
    # Loan parameters
    loan_amount = 50000
    num_months = 12
    
    # Generate comprehensive report
    report = planner.generate_comprehensive_report(
        farmer_info=farmer_info,
        loan_amount=loan_amount,
        num_months=num_months
    )
    
    # Print report
    print(f"\nFARMER: {farmer_info['name']}")
    print(f"LOAN AMOUNT: ₹{loan_amount:,.2f}")
    print(f"DURATION: {num_months} months")
    print("-" * 60)
    
    print(f"\nINCOME FORECAST:")
    print(f"  Average Monthly Income: ₹{report['forecast']['avg_income']:,.2f}")
    print(f"  Range: ₹{report['forecast']['min_income']:,.2f} - ₹{report['forecast']['max_income']:,.2f}")
    print(f"  Volatility (Std Dev): ₹{report['forecast']['income_std']:,.2f}")
    
    print(f"\nEMI SCHEDULE STATUS: {report['emi_schedule']['status']}")
    print(f"  Average EMI: ₹{report['emi_schedule']['avg_emi']:,.2f}")
    print(f"  Avg EMI/Income Ratio: {report['affordability']['avg_emi_to_income_ratio']:.1f}%")
    print(f"  Status: {report['affordability']['affordability_level']}")
    
    print(f"\nRISK ANALYSIS:")
    print(f"  Average Risk Score: {report['risk_analysis']['avg_risk_score']:.1f}/100")
    print(f"  Risk Level: {report['risk_analysis']['risk_level']}")
    
    print(f"\nRECOMMENDATIONS:")
    for rec in report['recommendations']:
        print(f"  [{rec['type'].upper()}] {rec['message']}")
    
    print("\n" + "="*60)
    
    # Save report as JSON for API consumption
    with open("emi_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print("Report saved to emi_report.json")