from flask import Flask, request, jsonify
import pickle
import numpy as np
import os
from emi_optimizer import optimize_emi_schedule

app = Flask(__name__)

# Load models
model_lgb = None
model2 = None

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
except Exception as e:
    print(f"Warning: model2_catboost.pkl not found or could not be loaded: {str(e)}")
    model2 = None  # Make model2 optional

# Income prediction endpoint using LightGBM model
@app.route("/predict-income", methods=["POST"])
def predict_income():
    try:
        if model_lgb is None:
            return jsonify({"error": "Model not loaded. Please train model1.py first"}), 500
            
        data = request.json
        features = data.get("features", [])
        
        if not features or len(features) < 6:
            return jsonify({"error": "Invalid features. Expected 6 features: [rainfall, ndvi, mandi_price, price_shock, income_lag_1, income_lag_2]"}), 400
        
        # Convert to numpy array for prediction
        features_array = np.array([features])
        
        # Make prediction using LightGBM model
        prediction = model_lgb.predict(features_array)[0]
        
        return jsonify({
            "predicted_income": float(prediction),
            "features_used": {
                "rainfall": features[0],
                "ndvi": features[1],
                "mandi_price": features[2],
                "price_shock": features[3],
                "income_lag_1": features[4],
                "income_lag_2": features[5]
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

        pred_income = model_lgb.predict([data["features_model1"]])[0]
        
        if model2 is not None:
            risk = model2.predict_proba([data["features_model2"]])[0][1]
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