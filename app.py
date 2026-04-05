from flask import Flask, request, jsonify
import pickle
import numpy as np
import pandas as pd
import os
from emi_optimizer import optimize_emi_schedule

app = Flask(__name__)

# Load models
model_lgb = None
model2 = None
model2_feature_names = None
model2_cat_feature_names = None

try:
    if os.path.exists("model1_lgb.pkl"):
        model_lgb = pickle.load(open("model1_lgb.pkl", "rb"))
    else:
        print("Warning: model1_lgb.pkl not found. Please train the model first using model1.py")
except Exception as e:
    print(f"Error loading model1_lgb.pkl: {str(e)}")

try:
    if os.path.exists("model2_catboost.pkl"):
        model2 = pickle.load(open("model2_catboost.pkl", "rb"))
        if os.path.exists("model2_features.pkl"):
            model2_feature_names = pickle.load(open("model2_features.pkl", "rb"))
        if os.path.exists("model2_cat_features.pkl"):
            model2_cat_feature_names = pickle.load(open("model2_cat_features.pkl", "rb"))
except Exception as e:
    print(f"Warning: model2_catboost.pkl not found or could not be loaded: {str(e)}")
    model2 = None  # Make model2 optional
    model2_feature_names = None
    model2_cat_feature_names = None


def _model2_proba_row(model, row_values, feature_names, cat_names):
    row = dict(zip(feature_names, row_values))
    if cat_names:
        for c in cat_names:
            if c in row:
                row[c] = str(row[c])
    return float(model.predict_proba(pd.DataFrame([row]))[0][1])

# Income prediction endpoint using LightGBM model
@app.route("/predict-income", methods=["POST"])
def predict_income():
    try:
        if model_lgb is None:
            return jsonify({"error": "Model not loaded. Please train model1.py first"}), 500
            
        data = request.json
        features = data.get("features", [])
        
        if not features or len(features) < 6:
            return jsonify({
                "error": "Invalid features. Expected 6 values matching model1.py: "
                "[actual_rainfall_mm, ndvi_value, kharif_mandi_price, price_shock_pct (decimal mo/mo), "
                "net_income_lag1, net_income_lag2]"
            }), 400
        
        # Convert to numpy array for prediction
        features_array = np.array([features])
        
        # Make prediction using LightGBM model
        prediction = model_lgb.predict(features_array)[0]
        
        return jsonify({
            "predicted_income": float(prediction),
            "features_used": {
                "actual_rainfall_mm": features[0],
                "ndvi_value": features[1],
                "kharif_mandi_price": features[2],
                "price_shock_pct": features[3],
                "net_income_lag1": features[4],
                "net_income_lag2": features[5]
            }
        })
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/full-pipeline", methods=["POST"])
def full_pipeline():
    try:
        if model_lgb is None:
            return jsonify({"error": "Model not loaded. Please train model1.py first"}), 500
            
        data = request.json

        pred_income = float(model_lgb.predict([data["features_model1"]])[0])

        if model2 is not None:
            m2 = data.get("features_model2")
            if m2 is None:
                return jsonify({"error": "features_model2 required"}), 400
            # Accept either 8 stress features (income from model1) or 9 with explicit net_income last
            if len(m2) == 8:
                m2_row = list(m2) + [max(pred_income, 0.0)]
            elif len(m2) == 9:
                m2_row = list(m2[:-1]) + [max(pred_income, 0.0)]
            else:
                return jsonify({
                    "error": "features_model2 must be 8 values "
                    "[state, district, crop, irrigation, rainfall_deviation_pct, "
                    "ndvi_stress_months, drought_months_12m, kharif_msp_diff] "
                    "(model1 predicted income appended automatically), or 9 values with last replaced."
                }), 400
            if model2_feature_names is not None and len(model2_feature_names) == len(m2_row):
                risk = _model2_proba_row(
                    model2, m2_row, model2_feature_names, model2_cat_feature_names or []
                )
            else:
                risk = float(model2.predict_proba([m2_row])[0][1])
        else:
            risk = 0.5  # Default risk if model2 not available

        max_pct = 0.25 if risk > 0.8 else 0.40

        status, schedule = optimize_emi_schedule(
            predicted_incomes=data["future_income_array"],
            total_outstanding=data["loan_amount"],
            max_emi_pct=max_pct
        )

        return jsonify({
            "predicted_income": float(pred_income),
            "risk_score": float(risk),
            "emi_status": status,
            "emi_schedule": schedule.tolist() if schedule is not None else None
        })
    except Exception as e:
        print(f"Pipeline error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)