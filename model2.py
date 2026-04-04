import pandas as pd
import numpy as np
import pickle
from catboost import CatBoostClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report

print("Loading data...")
df = pd.read_csv("final_farmer_clean.csv")

df['year_month'] = pd.to_datetime(df['year_month'])
df = df.sort_values(by=['farmer_id', 'year_month']).reset_index(drop=True)

print("Engineering environmental & economic stress features...")

df['is_ndvi_stress'] = (df['ndvi_value'] < 0.4).astype(int)
df['ndvi_stress_months'] = df.groupby('farmer_id')['is_ndvi_stress'].transform(lambda x: x.rolling(3, min_periods=1).sum())

df['is_drought'] = (df['rainfall_deviation_pct'] < -20.0).astype(int)
df['drought_months_12m'] = df.groupby('farmer_id')['is_drought'].transform(lambda x: x.rolling(12, min_periods=1).sum())

df['rolling_kharif_price'] = df.groupby('farmer_id')['kharif_mandi_price'].transform(lambda x: x.rolling(12, min_periods=1).mean())
df['kharif_msp_diff'] = df['kharif_mandi_price'] - df['rolling_kharif_price']

df = df.dropna().reset_index(drop=True)

features = ['state', 'district', 'primary_kharif_crop', 'irrigation_type', 
            'rainfall_deviation_pct', 'ndvi_stress_months', 'drought_months_12m', 'kharif_msp_diff']

target = 'default_within_12m'

cat_features = ['state', 'district', 'primary_kharif_crop', 'irrigation_type']

for col in cat_features:
    df[col] = df[col].astype(str)

X = df[features]
y = df[target]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print("Training CatBoost Classifier...")

model = CatBoostClassifier(
    iterations=150,
    learning_rate=0.08,
    depth=6,
    cat_features=cat_features,
    verbose=0,
    random_seed=42
)

model.fit(X_train, y_train)

y_train_pred = model.predict(X_train)
y_test_pred = model.predict(X_test)

y_train_prob = model.predict_proba(X_train)[:, 1]
y_test_prob = model.predict_proba(X_test)[:, 1]

acc_train = accuracy_score(y_train, y_train_pred)
acc_test = accuracy_score(y_test, y_test_pred)

roc_train = roc_auc_score(y_train, y_train_prob)
roc_test = roc_auc_score(y_test, y_test_prob)

print("\n" + "="*45)
print("PILLAR B: STRESS DETECTOR METRICS")
print("="*45)

print("TRAINING PERFORMANCE:")
print(f" - Accuracy: {acc_train * 100:.2f}%")
print(f" - ROC-AUC:  {roc_train:.4f}")

print("-" * 45)

print("TESTING PERFORMANCE:")
print(f" - Accuracy: {acc_test * 100:.2f}%")
print(f" - ROC-AUC:  {roc_test:.4f}")

print("="*45)

print("\nDetailed Test Set Classification Report:")
print(classification_report(y_test, y_test_pred))

print("\nSaving model...")

with open("model2_catboost.pkl", "wb") as f:
    pickle.dump(model, f)

with open("model2_features.pkl", "wb") as f:
    pickle.dump(features, f)

with open("model2_cat_features.pkl", "wb") as f:
    pickle.dump(cat_features, f)

print("Model saved as model2_catboost.pkl")
print("Features saved as model2_features.pkl")
print("Categorical features saved as model2_cat_features.pkl")

print("\nTesting saved model...")

loaded_model = pickle.load(open("model2_catboost.pkl", "rb"))
sample_input = X_test.iloc[0:1]
prediction = loaded_model.predict(sample_input)

print("Sample Prediction:", prediction[0])