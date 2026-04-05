"""
CLI for Node app: reads farmer/loan JSON, prints model3 report JSON on stdout.
Usage: python emi_runner.py <input.json>
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def main():
    if len(sys.argv) < 2:
        err = {"status": "error", "message": "Missing input JSON path"}
        print(json.dumps(err), file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    with open(input_path, encoding="utf-8") as f:
        data = json.load(f)

    from model3 import EMIPlannerModel

    planner = EMIPlannerModel()
    farmer_info = {
        "name": data.get("farmer_name") or "",
        "district": data.get("farmer_district") or "",
        "state": data.get("farmer_state") or "",
        "crop": data.get("farmer_crop") or "",
        "irrigation": data.get("farmer_irrigation") or "",
    }
    loan_amount = float(data["loan_amount"])
    num_months = int(data["duration_months"])

    report = planner.generate_comprehensive_report(
        farmer_info=farmer_info,
        loan_amount=loan_amount,
        num_months=num_months,
    )
    print(json.dumps(report, default=str))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        err = {
            "status": "error",
            "error": str(e),
            "message": "Failed to generate EMI plan",
        }
        print(json.dumps(err, default=str))
        sys.exit(1)
