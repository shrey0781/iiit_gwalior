"""
Run model1 (income), inject predicted net_income into model2 (default risk), print JSON.

Usage (from repo root):
  python chained_predict.py
  python chained_predict.py path/to/input.json

input.json example:
{
  "features_model1": [100.5, 0.65, 2500, 0.02, 15000, 14000],
  "features_model2": ["MP", "Vidisha", "Wheat", "Borewell", -15.0, 2, 3, 120.0]
}
(last value in features_model2 is kharif_msp_diff; net_income is filled from model1)
"""
import json
import os
import sys

import pandas as pd
import pickle

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)


def main():
    sample = {
        "features_model1": [100.5, 0.65, 2500.0, 0.02, 15000.0, 14000.0],
        "features_model2": ["MP", "Vidisha", "Wheat", "Borewell", -15.0, 2, 3, 120.0],
    }
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = sample

    m1 = data["features_model1"]
    m2 = data["features_model2"]

    with open("model1_lgb.pkl", "rb") as f:
        model1 = pickle.load(f)
    with open("model1_features.pkl", "rb") as f:
        m1_names = pickle.load(f)
    with open("model2_catboost.pkl", "rb") as f:
        model2 = pickle.load(f)
    with open("model2_features.pkl", "rb") as f:
        feat_names = pickle.load(f)
    with open("model2_cat_features.pkl", "rb") as f:
        cat_names = pickle.load(f)

    df1 = pd.DataFrame([dict(zip(m1_names, m1))])
    pred_income = float(model1.predict(df1)[0])
    pred_income = max(pred_income, 0.0)

    if len(m2) == 8:
        m2_row = list(m2) + [pred_income]
    elif len(m2) == 9:
        m2_row = list(m2[:-1]) + [pred_income]
    else:
        print(
            json.dumps(
                {
                    "error": "features_model2 must have 8 or 9 values "
                    "(8 stress fields; net_income from model1 is appended)."
                }
            ),
            file=sys.stderr,
        )
        sys.exit(1)

    if len(feat_names) != len(m2_row):
        print(
            json.dumps(
                {
                    "error": f"Row length {len(m2_row)} != model2 feature count {len(feat_names)}",
                    "feature_names": feat_names,
                }
            ),
            file=sys.stderr,
        )
        sys.exit(1)

    row = dict(zip(feat_names, m2_row))
    for c in cat_names:
        row[c] = str(row[c])
    df = pd.DataFrame([row])
    risk = float(model2.predict_proba(df)[0, 1])

    out = {
        "predicted_income_from_model1": pred_income,
        "default_risk_probability_model2": risk,
        "model2_features_used": row,
    }
    print(json.dumps(out, indent=2, default=str))


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        print(json.dumps({"error": str(e), "hint": "Run model1.py and model2.py first"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
