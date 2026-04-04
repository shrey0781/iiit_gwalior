# AgriFlow Income Prediction - Setup Instructions

## Overview
This project implements ML models for predicting farmer income and optimizing EMI schedules based on income predictions.

## Python Dependencies Installed

The following Python packages have been installed in `requirements.txt`:
- **Flask** >= 2.3.0 - Web framework for building the prediction API
- **numpy** >= 1.24.0 - Numerical computing
- **pandas** >= 2.0.0 - Data analysis and manipulation
- **scikit-learn** >= 1.3.0 - Machine learning utilities
- **lightgbm** >= 4.0.0 - LightGBM gradient boosting for income prediction (Model 1)
- **catboost** >= 1.2.0 - CatBoost classifier for risk prediction (Model 2) - *Not yet installed due to size*
- **scipy** >= 1.11.0 - Scientific computing
- **setuptools** >= 70.0.0 - Build tools

### Installation Status
✅ **Installed:**
- Flask 3.1.3
- scikit-learn 1.8.0
- lightgbm 4.6.0
- numpy 2.4.3
- pandas 3.0.1
- scipy 1.17.1

⏳ **Not yet installed:**
- catboost (large file, 101.7 MB - install when network is stable)

## Setup Steps

### 1. Verify Python Installation
```bash
python --version
# Should be Python 3.14+
```

### 2. Install Missing Catboost (Optional)
If you need the risk prediction model (model2), install catboost:
```bash
pip install catboost --no-deps
```

### 3. Train the Models

#### Train Income Prediction Model (LightGBM)
```bash
python model1.py
```
This will:
- Load `final_farmer_clean.csv`
- Engineer features (rainfall, NDVI, mandi price, price shocks, income lags)
- Train a LightGBM regressor
- Save model as `model1_lgb.pkl`
- Display performance metrics (RMSE, R² score)

#### Train Risk Prediction Model (CatBoost) - Optional
```bash
python model2.py
```
This will:
- Train a CatBoost classifier for risk prediction
- Save model as `model2_catboost.pkl`
- Display classification metrics

### 4. Run the Flask API
```bash
python app.py
```
The API will start on `http://localhost:5000`

## API Endpoints

### POST `/predict-income`
Predicts farmer income based on features.

**Request:**
```json
{
  "features": [
    100.5,    # rainfall (mm)
    0.65,     # NDVI value
    2500,     # mandi price (INR)
    0.05,     # price shock (%)
    15000,    # income lag 1 (INR)
    14000     # income lag 2 (INR)
  ]
}
```

**Response:**
```json
{
  "predicted_income": 18500.75,
  "features_used": {
    "rainfall": 100.5,
    "ndvi": 0.65,
    "mandi_price": 2500,
    "price_shock": 0.05,
    "income_lag_1": 15000,
    "income_lag_2": 14000
  }
}
```

### POST `/full-pipeline`
Predicts income and calculates optimal EMI schedule based on risk.

**Request:**
```json
{
  "features_model1": [100.5, 0.65, 2500, 0.05, 15000, 14000],
  "features_model2": ["State", "District", "Crop", "Drip", -15, 2, 3, 500],
  "future_income_array": [18000, 19000, 17500, 20000, 19500],
  "loan_amount": 100000
}
```

**Response:**
```json
{
  "predicted_income": 18500.75,
  "risk_score": 0.35,
  "emi_status": "Optimal",
  "emi_schedule": [20000, 20000, 20000, 20000, 20000]
}
```

## Bug Fixes Applied

### 1. Improved Error Handling (app.py)
- Added proper model loading with file existence checks
- Added try-except blocks for missing models
- Models now load gracefully if pickle files don't exist
- Better error messages for debugging

### 2. Input Validation (app.py)
- Added validation for minimum feature count (6 required)
- Added error messages explaining required feature format
- Added full exception traceback for debugging

### 3. Feature Files
- Created `requirements.txt` with all dependencies
- Fixed model loading to handle missing files gracefully
- Added robust error handling in Flask endpoints

## Troubleshooting

### Issue: "Model not loaded" Error
**Solution:** Train model1.py first:
```bash
python model1.py
```

### Issue: "Invalid features" Error
**Solution:** Ensure you send exactly 6 features in the correct order:
1. Rainfall (mm)
2. NDVI value (0-1)
3. Mandi price (INR)
4. Price shock (%)
5. Income lag 1 (INR)
6. Income lag 2 (INR)

### Issue: Catboost Installation Fails
**Solution:** Use `--no-deps` flag to avoid downloading optional dependencies:
```bash
pip install catboost --no-deps
```

### Issue: Network Timeout During Installation
**Solution:** Retry with better connectivity or use a different network:
```bash
pip install -r requirements.txt --retries 5
```

## File Structure

```
project/
├── app.py                      # Flask API with prediction endpoints
├── model1.py                   # Income prediction model training (LightGBM)
├── model2.py                   # Risk prediction model training (CatBoost)
├── emi_optimizer.py           # EMI schedule optimization
├── final_farmer_clean.csv     # Training data
├── requirements.txt           # Python dependencies
├── model1_lgb.pkl            # Trained income model (generated after running model1.py)
├── model2_catboost.pkl       # Trained risk model (generated after running model2.py)
└── SETUP_INSTRUCTIONS.md      # This file
```

## Next Steps

1. ✅ Install Python dependencies (Done)
2. ⏳ Run `python model1.py` to train income prediction model
3. ⏳ Run `python model2.py` (optional) to train risk prediction model
4. ⏳ Start Flask API with `python app.py`
5. ⏳ Test endpoints using Postman or curl

## Notes

- The income prediction model uses LightGBM for fast training and prediction
- The risk model uses CatBoost for better handling of categorical features
- The EMI optimizer uses linear programming to distribute loan repayments
- All models make predictions based on historical farmer data from `final_farmer_clean.csv`
