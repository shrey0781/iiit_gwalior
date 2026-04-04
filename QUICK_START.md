# Quick Start Guide - Income Prediction

## What Was Fixed

1. ✅ **Created requirements.txt** - All Python packages listed with appropriate versions
2. ✅ **Installed Core Packages** - Flask, LightGBM, scikit-learn, numpy, pandas, scipy
3. ✅ **Fixed app.py** - Added robust error handling and model loading checks
4. ✅ **Added Input Validation** - Better error messages for API requests
5. ✅ **Documentation** - Complete setup and troubleshooting guide

## Quick Start (5 minutes)

### Step 1: Train the Income Model
```bash
python model1.py
```
**Wait for output showing:**
- Model training completion
- RMSE and R² metrics
- Feature importances
- "Model saved as model1_lgb.pkl" ✓

### Step 2: Start the API
```bash
python app.py
```
**Look for:** `Running on http://localhost:5000`

### Step 3: Test the API
Open a new terminal and run:
```bash
curl -X POST http://localhost:5000/predict-income \
  -H "Content-Type: application/json" \
  -d '{"features": [100.5, 0.65, 2500, 0.05, 15000, 14000]}'
```

**Expected Response:**
```json
{
  "predicted_income": 18500.75,
  "features_used": {...}
}
```

## API Reference

### Predict Income Endpoint
**URL:** `POST http://localhost:5000/predict-income`

**Input:** 6 numeric features
```json
{
  "features": [
    rainfall_mm,        // Actual rainfall in mm
    ndvi_value,         // Vegetation index (0-1)
    mandi_price,        // Market price in INR
    price_shock_pct,    // Price change percentage
    income_lag_1,       // Previous month income
    income_lag_2        // 2 months prior income
  ]
}
```

**Output:** Predicted income + feature echo
```json
{
  "predicted_income": float,
  "features_used": {...}
}
```

## Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "Model not loaded" | Run `python model1.py` first |
| "Invalid features" | Send exactly 6 numeric values |
| Connection refused | Make sure `python app.py` is running |
| Import error | Run `pip install -r requirements.txt` |

## File Checklist

After running model1.py, verify these files exist:
- ✓ `model1_lgb.pkl` (trained model)
- ✓ `model1_features.pkl` (feature names)
- ✓ `app.py` (fixed - now handles missing models)
- ✓ `requirements.txt` (all dependencies)
- ✓ `SETUP_INSTRUCTIONS.md` (full guide)

## Performance Metrics (Expected)

After training, model1.py should show:
- **RMSE:** ~₹5,000-10,000 (depends on data quality)
- **R² Score:** 0.7-0.9 (good prediction accuracy)
- **Top Features:** Typically income lag + price + rainfall

## Next Steps

1. Train additional months of data for better accuracy
2. Integrate with your frontend (agriflow-income.ejs)
3. Deploy to production server
4. Monitor prediction errors in logs
5. Retrain model monthly with new farmer data

## Support

For issues:
1. Check logs in terminal where `python app.py` is running
2. Verify all input features are numeric
3. Ensure data file `final_farmer_clean.csv` exists
4. Check README.md for project details
