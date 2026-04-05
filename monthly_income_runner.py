"""
12-month net income series using model1_lgb.pkl + model1_features.pkl (same as model1.py).
Reads farm JSON from argv[1], prints one JSON object on stdout.
No Flask required.
"""
import json
import os
import sys

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Training CSV (final_farmer_clean): actual_rainfall_mm median ~31, mean ~80; monsoon months much higher.
_RAIN_SHAPE = np.array(
    [12.0, 10.0, 14.0, 22.0, 42.0, 125.0, 210.0, 195.0, 135.0, 48.0, 20.0, 11.0], dtype=float
)
_NDVI_SEASON = np.array(
    [0.12, 0.10, 0.18, 0.38, 0.62, 0.95, 1.05, 1.0, 0.82, 0.48, 0.28, 0.15], dtype=float
)

_CROP_MANDI_BASE = {
    "धान": 2100,
    "गेहूं": 2200,
    "कपास": 5800,
    "गन्ना": 3200,
    "सोयाबीन": 4500,
    "मक्का": 1800,
    "अन्य": 2500,
}

_CROP_NDVI_BASE = {
    "धान": 0.65,
    "गेहूं": 0.60,
    "कपास": 0.58,
    "गन्ना": 0.68,
    "सोयाबीन": 0.62,
    "मक्का": 0.64,
    "अन्य": 0.60,
}


def _mandi_price(crop: str) -> int:
    base = _CROP_MANDI_BASE.get(crop, _CROP_MANDI_BASE["अन्य"])
    v = 0.95 + np.random.random() * 0.1
    return max(1800, int(base * v))


def _ndvi_base(crop: str, fertilizer: float, pesticide: float) -> float:
    ndvi = _CROP_NDVI_BASE.get(crop, 0.60)
    if fertilizer > 200:
        ndvi += 0.05
    if pesticide > 5:
        ndvi += 0.03
    return float(np.clip(ndvi, 0.15, 0.85))


def _net_income_lags(crop: str, land: float, mandi: int) -> tuple[float, float]:
    k = 25 if crop in ("धान", "गेहूं") else 20
    est_m = int(mandi * land * k / 12)
    base = max(5000, est_m)
    return float(int(base * 0.95)), float(int(base * 0.90))


def _monthly_rainfall_mm(annual_target: float) -> np.ndarray:
    s = _RAIN_SHAPE.sum()
    return _RAIN_SHAPE / s * annual_target


def _price_path(base: int, n: int = 12) -> list[int]:
    p = [max(100, int(base))]
    for _ in range(1, n):
        drift = 1.0 + (np.random.random() * 0.06 - 0.03)
        p.append(max(100, int(p[-1] * drift)))
    return p


def main() -> None:
    def _out_json(obj: dict) -> None:
        raw = json.dumps(obj, ensure_ascii=False) + "\n"
        sys.stdout.buffer.write(raw.encode("utf-8"))

    if len(sys.argv) < 2:
        _out_json({"status": "error", "message": "Missing input JSON path"})
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)

    crop = data.get("crop") or "गेहूं"
    land = float(data.get("land", 4))
    fertilizer = float(data.get("fertilizer", 200))
    pesticide = float(data.get("pesticide", 5))
    district = (data.get("district") or "").strip()

    model_path = os.path.join(ROOT, "model1_lgb.pkl")
    feat_path = os.path.join(ROOT, "model1_features.pkl")
    if not os.path.isfile(model_path) or not os.path.isfile(feat_path):
        err = {
            "status": "error",
            "message": "model1_lgb.pkl or model1_features.pkl not found next to monthly_income_runner.py",
        }
        _out_json(err)
        sys.exit(1)

    import pickle

    with open(model_path, "rb") as f:
        model = pickle.load(f)
    with open(feat_path, "rb") as f:
        feature_names = pickle.load(f)

    np.random.seed(hash(district + crop) % (2**32))

    base_mandi = _mandi_price(crop)
    ndvi_peak = _ndvi_base(crop, fertilizer, pesticide)
    # Annual rain ~700–1150 mm typical MP / central India; district string only seeds variation
    annual_rain = 780.0 + (abs(hash(district)) % 380)
    rain_mm = _monthly_rainfall_mm(annual_rain)
    prices = _price_path(base_mandi, 12)
    lag1, lag2 = _net_income_lags(crop, land, base_mandi)

    months_hi = [
        "जनवरी",
        "फरवरी",
        "मार्च",
        "अप्रैल",
        "मई",
        "जून",
        "जुलाई",
        "अगस्त",
        "सितम्बर",
        "अक्टूबर",
        "नवम्बर",
        "दिसम्बर",
    ]

    monthly_data = []
    shocks = []

    for i in range(12):
        r = float(rain_mm[i])
        ndvi = float(np.clip(ndvi_peak * _NDVI_SEASON[i], 0.0, 0.857))
        mp = int(prices[i])
        shock = 0.0 if i == 0 else (mp - prices[i - 1]) / float(prices[i - 1])
        shocks.append(shock)

        row = {
            "actual_rainfall_mm": r,
            "ndvi_value": ndvi,
            "kharif_mandi_price": float(mp),
            "price_shock_pct": float(shock),
            "net_income_lag1": float(lag1),
            "net_income_lag2": float(lag2),
        }
        X = pd.DataFrame([row])[list(feature_names)]
        pred = float(model.predict(X)[0])
        pred = max(500.0, pred)

        monthly_data.append({"month": months_hi[i], "income": int(round(pred))})
        lag2, lag1 = lag1, pred

    avg_shock_pct = float(np.mean(shocks)) if shocks else 0.0

    out = {
        "status": "success",
        "source": "model1_lgb",
        "monthlyData": monthly_data,
        "rainfall": float(np.mean(rain_mm)),
        "ndvi": ndvi_peak,
        "mandiPrice": base_mandi,
        "priceShock": round(avg_shock_pct * 100, 2),
    }
    _out_json(out)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        err = json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False) + "\n"
        sys.stdout.buffer.write(err.encode("utf-8"))
        sys.exit(1)
