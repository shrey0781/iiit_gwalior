import numpy as np
from scipy.optimize import linprog

def optimize_emi_schedule(predicted_incomes, total_outstanding, max_emi_pct=0.40, min_maintenance_fee=500):
    num_months = len(predicted_incomes)

    c = np.zeros(num_months)

    A_eq = np.ones((1, num_months))
    b_eq = np.array([total_outstanding])

    bounds = []
    for income in predicted_incomes:
        max_capacity = max(min_maintenance_fee, income * max_emi_pct)
        bounds.append((min_maintenance_fee, max_capacity))

    res = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

    if res.success:
        return "Optimal", np.round(res.x, 2)
    else:
        return "Infeasible", None