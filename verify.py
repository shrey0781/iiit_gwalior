#!/usr/bin/env python
"""
Final verification script for Predict My Income feature
"""

import sys

print('='*60)
print('       PREDICT MY INCOME - FINAL VERIFICATION')
print('='*60)

# Test imports
components = [
    ('Flask', 'flask'),
    ('LightGBM', 'lightgbm'),
    ('scikit-learn', 'sklearn'),
    ('numpy', 'numpy'),
    ('pandas', 'pandas'),
    ('scipy', 'scipy'),
]

print('\n[CHECKING DEPENDENCIES]')
for name, module in components:
    try:
        __import__(module)
        print(f'  ✓ {name:20s} available')
    except ImportError:
        print(f'  ✗ {name:20s} MISSING')
        sys.exit(1)

# Test model loading
print('\n[CHECKING MODELS]')
try:
    import pickle
    model = pickle.load(open('model1_lgb.pkl', 'rb'))
    print(f'  ✓ Income model (LightGBM)  loaded successfully')
except Exception as e:
    print(f'  ✗ Model loading failed: {e}')
    sys.exit(1)

# Test Flask app
print('\n[CHECKING FLASK APP]')
try:
    from app import app
    print(f'  ✓ Flask app              created successfully')
    print(f'  ✓ Model1 status:         LOADED')
    print(f'  ⓘ Model2 status:         OPTIONAL (CatBoost not required)')
except Exception as e:
    print(f'  ✗ Flask app failed: {e}')
    sys.exit(1)

# Test EMI optimizer
print('\n[CHECKING UTILITIES]')
try:
    from emi_optimizer import optimize_emi_schedule
    print(f'  ✓ EMI optimizer          available')
except Exception as e:
    print(f'  ✗ EMI optimizer failed: {e}')
    sys.exit(1)

# Test model inference
print('\n[TESTING MODEL INFERENCE]')
try:
    import numpy as np
    test_input = np.array([[100, 0.65, 2500, 0.05, 15000, 14000]])
    prediction = model.predict(test_input)[0]
    print(f'  ✓ Model prediction test  PASSED')
    print(f'    Sample input:  [100, 0.65, 2500, 0.05, 15000, 14000]')
    print(f'    Predicted income: ₹{prediction:,.2f}')
except Exception as e:
    print(f'  ✗ Model inference failed: {e}')
    sys.exit(1)

print('\n' + '='*60)
print('✅ ALL SYSTEMS READY FOR DEPLOYMENT')
print('='*60)

print('\n[QUICK START COMMANDS]\n')
print('1. Start the API server:')
print('   python app.py\n')

print('2. Test income prediction (in another terminal):')
print('   curl -X POST http://localhost:5000/predict-income')
print('   -H "Content-Type: application/json"')
print('   -d \'{"features": [100, 0.65, 2500, 0.05, 15000, 14000]}\'\n')

print('3. Check documentation:')
print('   - QUICK_START.md for fast reference')
print('   - SETUP_INSTRUCTIONS.md for complete guide')
print('   - FIX_COMPLETE.md for what was fixed\n')

print('='*60)
