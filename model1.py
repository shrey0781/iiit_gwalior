import pandas as pd
import numpy as np
import lightgbm as lgb
import pickle
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

print("Loading data...")
df = pd.read_csv("final_farmer_clean.csv")

df['year_month'] = pd.to_datetime(df['year_month'])
df = df.sort_values(by=['farmer_id', 'year_month']).reset_index(drop=True)

df['net_income'] = df['monthly_inflow_inr'] - df['monthly_outflow_inr']

print("Engineering features...")

df['net_income_lag1'] = df.groupby('farmer_id')['net_income'].shift(1)
df['net_income_lag2'] = df.groupby('farmer_id')['net_income'].shift(2)

df['price_shock_pct'] = df.groupby('farmer_id')['kharif_mandi_price'].pct_change().fillna(0)

df = df.dropna().reset_index(drop=True)

features = [
    'actual_rainfall_mm',
    'ndvi_value',
    'kharif_mandi_price',
    'price_shock_pct',
    'net_income_lag1',
    'net_income_lag2'
]

target = 'net_income'

X = df[features]
y = df[target]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, shuffle=False
)

print("Training LightGBM Regressor...")

model = lgb.LGBMRegressor(
    n_estimators=100,
    learning_rate=0.05,
    max_depth=5,
    random_state=42
)

model.fit(X_train, y_train)

y_train_pred = model.predict(X_train)
y_test_pred = model.predict(X_test)

rmse_train = np.sqrt(mean_squared_error(y_train, y_train_pred))
rmse_test = np.sqrt(mean_squared_error(y_test, y_test_pred))

r2_train = r2_score(y_train, y_train_pred)
r2_test = r2_score(y_test, y_test_pred)

print("\n" + "="*40)
print("MODEL EVALUATION METRICS")
print("="*40)

print("TRAINING PERFORMANCE:")
print(f" - RMSE: INR {rmse_train:,.2f}")
print(f" - R² Score: {r2_train:.4f} ({(r2_train*100):.1f}% variance explained)")

print("-" * 40)

print("TESTING PERFORMANCE:")
print(f" - RMSE: INR {rmse_test:,.2f}")
print(f" - R² Score: {r2_test:.4f} ({(r2_test*100):.1f}% variance explained)")

print("="*40)

importances = pd.DataFrame({
    'Feature': features,
    'Importance': model.feature_importances_
}).sort_values(by='Importance', ascending=False)

print("\nFeature Importances:")
print(importances.to_string(index=False))

print("\nSaving model...")

with open("model1_lgb.pkl", "wb") as f:
    pickle.dump(model, f)

with open("model1_features.pkl", "wb") as f:
    pickle.dump(features, f)

print("Model saved as model1_lgb.pkl")
print("Features saved as model1_features.pkl")

print("\nTesting saved model...")

loaded_model = pickle.load(open("model1_lgb.pkl", "rb"))

sample_input = X_test.iloc[0:1]
prediction = loaded_model.predict(sample_input)

print("Sample Prediction:", prediction[0])