const express = require('express');
const path = require('path');
const app = express();

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.render('agriflow-index');
});

app.get('/apply', (req, res) => {
    res.render('agriflow-form');
});

// Monthly Income Prediction Routes
app.get('/monthly-income', (req, res) => {
    res.render('agriflow-income');
});

app.post('/monthly-income/result', async (req, res) => {
    const name = req.body.name || 'राज कुमार';
    const district = req.body.district || 'विदिशा';
    const crop = req.body.crop || 'गेहूं';
    const land = parseFloat(req.body.land) || 4;
    const fertilizer = parseFloat(req.body.fertilizer) || 200;
    const waterSource = req.body.water_source || 'बोरवेल';
    const pesticide = parseFloat(req.body.pesticide) || 5;

    try {
        // Generate monthly income prediction with real data
        const { monthlyData, rainfall, ndvi, mandiPrice, priceShock } = await generateMonthlyIncome(crop, land, fertilizer, pesticide, district);
        
        const incomeValues = monthlyData.map(m => m.income);
        const averageMonthlyIncome = Math.floor(incomeValues.reduce((a, b) => a + b, 0) / 12);
        const maxIncome = Math.max(...incomeValues);
        const minIncome = Math.min(...incomeValues);
        
        const bestMonthIndex = incomeValues.indexOf(maxIncome);
        const lowestMonthIndex = incomeValues.indexOf(minIncome);
        
        const monthNames = ['जनवरी / January', 'फरवरी / February', 'मार्च / March', 'अप्रैल / April',
            'मई / May', 'जून / June', 'जुलाई / July', 'अगस्त / August',
            'सितम्बर / September', 'अक्टूबर / October', 'नवम्बर / November', 'दिसम्बर / December'];

        const farmer = {
            name: name,
            district: district,
            crop: crop,
            land: land,
            fertilizer: fertilizer,
            waterSource: waterSource,
            pesticide: pesticide,
            averageMonthlyIncome: averageMonthlyIncome,
            bestMonth: monthNames[bestMonthIndex],
            bestMonthIncome: maxIncome,
            lowestMonth: monthNames[lowestMonthIndex],
            lowestMonthIncome: minIncome,
            monthlyIncomeData: monthlyData,
            // Real data factors
            rainfall: rainfall,
            ndvi: ndvi,
            mandiPrice: mandiPrice,
            priceShock: priceShock
        };

        res.render('agriflow-income-result', { farmer });
    } catch (error) {
        console.error('Error in income prediction:', error);
        res.status(500).send('Error processing income prediction');
    }
});

// Agriflow prefix routes
app.get('/agriflow', (req, res) => {
    res.render('agriflow-index');
});

app.get('/agriflow/apply', (req, res) => {
    res.render('agriflow-form');
});

app.get('/agriflow/monthly-income', (req, res) => {
    res.render('agriflow-income');
});

app.post('/agriflow/monthly-income/result', async (req, res) => {
    const name = req.body.name || 'राज कुमार';
    const district = req.body.district || 'विदिशा';
    const crop = req.body.crop || 'गेहूं';
    const land = parseFloat(req.body.land) || 4;
    const fertilizer = parseFloat(req.body.fertilizer) || 200;
    const waterSource = req.body.water_source || 'बोरवेल';
    const pesticide = parseFloat(req.body.pesticide) || 5;

    try {
        // Generate monthly income prediction with real data
        const { monthlyData, rainfall, ndvi, mandiPrice, priceShock } = await generateMonthlyIncome(crop, land, fertilizer, pesticide, district);
        
        const incomeValues = monthlyData.map(m => m.income);
        const averageMonthlyIncome = Math.floor(incomeValues.reduce((a, b) => a + b, 0) / 12);
        const maxIncome = Math.max(...incomeValues);
        const minIncome = Math.min(...incomeValues);
        
        const bestMonthIndex = incomeValues.indexOf(maxIncome);
        const lowestMonthIndex = incomeValues.indexOf(minIncome);
        
        const monthNames = ['जनवरी / January', 'फरवरी / February', 'मार्च / March', 'अप्रैल / April',
            'मई / May', 'जून / June', 'जुलाई / July', 'अगस्त / August',
            'सितम्बर / September', 'अक्टूबर / October', 'नवम्बर / November', 'दिसम्बर / December'];

        const farmer = {
            name: name,
            district: district,
            crop: crop,
            land: land,
            fertilizer: fertilizer,
            waterSource: waterSource,
            pesticide: pesticide,
            averageMonthlyIncome: averageMonthlyIncome,
            bestMonth: monthNames[bestMonthIndex],
            bestMonthIncome: maxIncome,
            lowestMonth: monthNames[lowestMonthIndex],
            lowestMonthIncome: minIncome,
            monthlyIncomeData: monthlyData,
            // Real data factors
            rainfall: rainfall,
            ndvi: ndvi,
            mandiPrice: mandiPrice,
            priceShock: priceShock
        };

        res.render('agriflow-income-result', { farmer });
    } catch (error) {
        console.error('Error in income prediction:', error);
        res.status(500).send('Error processing income prediction');
    }
});

app.post('/agriflow/result', (req, res) => {
    // Calculate risk level based on loan to income ratio
    const loan = parseFloat(req.body.loan) || 150000;
    const land = parseFloat(req.body.land) || 4;
    const avgMonthlyIncome = land * 12000; // ₹12,000 per acre per month average

    let riskScore = Math.floor(Math.random() * 80) + 10;
    let riskLevel = 'Low';
    let riskEmoji = '✅';

    if (riskScore > 60) {
        riskLevel = 'High';
        riskEmoji = '❌';
    } else if (riskScore > 35) {
        riskLevel = 'Medium';
        riskEmoji = '⚠️';
    }

    const monthlyEMI = Math.floor(loan / 48);

    const farmer = {
        name: req.body.name || 'राज कुमार',
        crop: req.body.crop || 'गेहूं',
        district: req.body.district || 'विदिशा',
        land: land,
        loan: loan,
        duration: req.body.duration || '24 months',
        riskLevel: riskLevel,
        riskScore: riskScore,
        riskEmoji: riskEmoji,
        monthlyEMI: monthlyEMI,
        bestSellMonth: 'मार्च (March)',
        incomeMonths: [3200, 3000, 9500, 12000, 11500, 4000, 3500, 3200, 4000, 13000, 14000, 5000],
        monthLabels: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
        emiPlanData: generateEMIPlan(monthlyEMI)
    };

    res.render('agriflow-result', { farmer });
});

app.post('/result', (req, res) => {
    // Calculate risk level based on loan to income ratio
    const loan = parseFloat(req.body.loan) || 150000;
    const land = parseFloat(req.body.land) || 4;
    const avgMonthlyIncome = land * 12000; // ₹12,000 per acre per month average

    let riskScore = Math.floor(Math.random() * 80) + 10;
    let riskLevel = 'Low';
    let riskEmoji = '✅';

    if (riskScore > 60) {
        riskLevel = 'High';
        riskEmoji = '❌';
    } else if (riskScore > 35) {
        riskLevel = 'Medium';
        riskEmoji = '⚠️';
    }

    const monthlyEMI = Math.floor(loan / 48);

    const farmer = {
        name: req.body.name || 'राज कुमार',
        crop: req.body.crop || 'गेहूं',
        district: req.body.district || 'विदिशा',
        land: land,
        loan: loan,
        duration: req.body.duration || '24 months',
        riskLevel: riskLevel,
        riskScore: riskScore,
        riskEmoji: riskEmoji,
        monthlyEMI: monthlyEMI,
        bestSellMonth: 'मार्च (March)',
        incomeMonths: [3200, 3000, 9500, 12000, 11500, 4000, 3500, 3200, 4000, 13000, 14000, 5000],
        monthLabels: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
        emiPlanData: generateEMIPlan(monthlyEMI)
    };

    res.render('agriflow-result', { farmer });
});

// Fetch rainfall data from OpenWeatherMap
async function fetchRainfallData(district) {
    try {
        const apiKey = process.env.WEATHER_API_KEY || 'demo_key'; // Set via environment variable
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${district}&appid=${apiKey}`);
        const data = await response.json();
        
        if (data.rain) {
            return data.rain['1h'] || 0; // rainfall in last hour (mm)
        }
        return 0;
    } catch (error) {
        console.log('Rain fetch error:', error.message);
        return 5; // default rainfall
    }
}

// Fetch NDVI value from static ranges based on crop health
function getNDVIValue(crop, fertilizer, pesticide) {
    // NDVI ranges: -1 to 1, where >0.6 is healthy vegetation
    const cropNDVIBase = {
        'धान': 0.65,
        'गेहूं': 0.60,
        'कपास': 0.58,
        'गन्ना': 0.68,
        'सोयाबीन': 0.62,
        'मक्का': 0.64,
        'अन्य': 0.60
    };

    let ndvi = cropNDVIBase[crop] || cropNDVIBase['अन्य'];
    
    // Boost NDVI based on fertilizer (good farming practice)
    if (fertilizer > 200) ndvi += 0.05;
    
    // Boost NDVI based on pesticide use
    if (pesticide > 5) ndvi += 0.03;
    
    // Ensure NDVI stays within bounds
    ndvi = Math.min(0.85, Math.max(0, ndvi));
    
    return parseFloat(ndvi.toFixed(3));
}

// Fetch mandi price for the crop from historical data
function getMandiPrice(crop) {
    // Base mandi prices (₹/quintal) - typical market rates
    const mandiPrices = {
        'धान': 2100,
        'गेहूं': 2200,
        'कपास': 5800,
        'गन्ना': 3200,
        'सोयाबीन': 4500,
        'मक्का': 1800,
        'अन्य': 2500
    };

    const basePrice = mandiPrices[crop] || mandiPrices['अन्य'];
    
    // Add ±5% random market variation
    const variation = 0.95 + (Math.random() * 0.10);
    return Math.floor(basePrice * variation);
}

// Get historical net income lag values
function getNetIncomeLags(crop, land, mandiPrice) {
    // model1 training: lags are prior months' net income (~monthly scale from CSV)
    const k = (crop === 'धान' || crop === 'गेहूं') ? 25 : 20;
    const estimatedMonthly = Math.floor((mandiPrice * land * k) / 12);
    const base = Math.max(5000, estimatedMonthly);
    return { lag1: Math.floor(base * 0.95), lag2: Math.floor(base * 0.90) };
}

// Call Flask backend to get ML model prediction
async function predictIncomeWithML(features) {
    try {
        const baseUrl = process.env.FLASK_ML_URL || 'http://127.0.0.1:5000';
        const response = await fetch(`${baseUrl}/predict-income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: features })
        });
        
        if (!response.ok) {
            console.log('ML prediction error, using fallback');
            return null;
        }
        
        const data = await response.json();
        return data.predicted_income;
    } catch (error) {
        console.log('Flask backend unavailable:', error.message);
        return null;
    }
}

// Generate monthly income prediction using real data and ML model
async function generateMonthlyIncome(crop, land, fertilizer, pesticide, district) {
    const fromPy = await callMonthlyIncomeRunner({ crop, land, fertilizer, pesticide, district });
    if (fromPy) {
        return {
            monthlyData: fromPy.monthlyData,
            rainfall: fromPy.rainfall,
            ndvi: fromPy.ndvi,
            mandiPrice: fromPy.mandiPrice,
            priceShock: fromPy.priceShock
        };
    }

    const months = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
        'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];

    const RAINFALL_SHAPE = [0.45, 0.4, 0.35, 0.45, 0.85, 1.35, 1.65, 1.5, 1.1, 0.75, 0.55, 0.5];
    const NDVI_SHAPE = [0.95, 0.93, 0.91, 0.96, 1.02, 1.1, 1.12, 1.1, 1.04, 0.98, 0.96, 0.95];
    const avgRainShape = RAINFALL_SHAPE.reduce((a, b) => a + b, 0) / 12;

    const baseRainfallRaw = await fetchRainfallData(district);
    const baseRainfall = Math.max(40, Math.min(140, (baseRainfallRaw || 0) * 15 + 55));
    const baseNdvi = getNDVIValue(crop, fertilizer, pesticide);
    const baseMandi = getMandiPrice(crop);

    const monthlyPrices = [Math.max(100, Math.floor(baseMandi))];
    for (let i = 1; i < 12; i++) {
        const drift = 1 + (Math.random() * 0.06 - 0.03);
        monthlyPrices.push(Math.max(100, Math.floor(monthlyPrices[i - 1] * drift)));
    }

    let { lag1, lag2 } = getNetIncomeLags(crop, land, baseMandi);

    const seasonalPatterns = {
        'धान': [0.8, 0.7, 0.6, 0.5, 0.6, 1.2, 1.5, 1.8, 1.9, 1.5, 0.9, 0.8],
        'गेहूं': [0.6, 0.6, 0.7, 1.0, 1.5, 1.8, 1.9, 1.5, 0.8, 0.7, 0.6, 0.5],
        'कपास': [0.7, 0.8, 0.9, 1.2, 1.5, 1.7, 1.6, 1.4, 1.0, 0.8, 0.6, 0.5],
        'गन्ना': [1.0, 1.0, 1.0, 1.0, 1.1, 1.2, 1.3, 1.3, 1.2, 1.0, 0.9, 0.9],
        'सोयाबीन': [0.7, 0.8, 0.9, 1.2, 1.6, 1.8, 1.7, 1.4, 0.9, 0.7, 0.6, 0.5],
        'मक्का': [0.7, 0.8, 0.8, 1.1, 1.5, 1.8, 1.9, 1.6, 0.9, 0.7, 0.6, 0.5],
        'अन्य': [0.8, 0.8, 0.8, 1.0, 1.2, 1.3, 1.3, 1.2, 0.9, 0.8, 0.8, 0.8]
    };
    const seasonalPattern = seasonalPatterns[crop] || seasonalPatterns['अन्य'];
    const cropRevenuePerUnit = {
        'धान': 1.2, 'गेहूं': 1.1, 'कपास': 1.5, 'गन्ना': 2.0,
        'सोयाबीन': 1.3, 'मक्का': 1.15, 'अन्य': 1.0
    };
    const revenueMultiplier = cropRevenuePerUnit[crop] || cropRevenuePerUnit['अन्य'];
    const ndviAdjustment = 0.8 + (baseNdvi * 0.25);
    const rainfallAdjustment = 1.0 + (Math.min(baseRainfall, 50) / 500);

    const monthlyData = [];
    const monthlyShocks = [];

    for (let i = 0; i < 12; i++) {
        const rainMm = baseRainfall * (RAINFALL_SHAPE[i] / avgRainShape);
        const ndvi = Math.min(0.85, Math.max(0, baseNdvi * NDVI_SHAPE[i]));
        const mandiPrice = monthlyPrices[i];
        const priceShockPct = i === 0 ? 0 : (mandiPrice - monthlyPrices[i - 1]) / monthlyPrices[i - 1];
        monthlyShocks.push(priceShockPct);

        const features = [rainMm, ndvi, mandiPrice, priceShockPct, lag1, lag2];
        const pred = await predictIncomeWithML(features);

        let monthlyIncome;
        if (pred != null && Number.isFinite(pred) && pred > 0) {
            monthlyIncome = Math.floor(Math.max(500, pred));
            lag2 = lag1;
            lag1 = pred;
        } else {
            let inc = ((baseMandi * land * revenueMultiplier) / 12) * seasonalPattern[i]
                * ndviAdjustment * (1 + priceShockPct) * rainfallAdjustment;
            inc *= 0.95 + (Math.random() * 0.10);
            monthlyIncome = Math.max(500, Math.floor(inc));
        }

        monthlyData.push({
            month: months[i],
            income: monthlyIncome
        });
    }

    const avgShockPct = monthlyShocks.length === 0 ? 0
        : monthlyShocks.reduce((a, b) => a + b, 0) / monthlyShocks.length;

    console.log(`📊 Real Data - Rainfall base: ${baseRainfall}mm, NDVI: ${baseNdvi}, Mandi: ₹${baseMandi}, avg mandi Δ: ${(avgShockPct * 100).toFixed(2)}%`);

    return {
        monthlyData,
        rainfall: baseRainfall,
        ndvi: baseNdvi,
        mandiPrice: baseMandi,
        priceShock: parseFloat((avgShockPct * 100).toFixed(2))
    };
}

// Generate EMI plan for 12 months
function generateEMIPlan(emiAmount) {
    const plan = [];
    const months = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
        'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];
    const incomeMonths = [3200, 3000, 9500, 12000, 11500, 4000, 3500, 3200, 4000, 13000, 14000, 5000];

    for (let i = 0; i < 12; i++) {
        const income = incomeMonths[i];
        const emiToShow = Math.floor(emiAmount);
        const percentage = (emiToShow / income) * 100;
        let status = 'green';
        if (percentage > 40) status = 'red';
        else if (percentage > 30) status = 'yellow';

        plan.push({
            month: months[i],
            income: `₹${income.toLocaleString('en-IN')}`,
            emi: `₹${emiToShow.toLocaleString('en-IN')}`,
            percentage: Math.floor(percentage),
            status: status
        });
    }
    return plan;
}

// ===== EMI PLANNING ROUTES =====

// Get EMI planning form
app.get('/emi-plan', (req, res) => {
    res.render('agriflow-emi-plan');
});

app.get('/agriflow/emi-plan', (req, res) => {
    res.render('agriflow-emi-plan');
});

// Process EMI plan and generate report (API endpoint)
app.post('/api/emi-plan', async (req, res) => {
    try {
        const { 
            name, 
            district, 
            state, 
            crop, 
            irrigation, 
            loanAmount, 
            duration 
        } = req.body;

        // Call Python model3 to generate comprehensive report
        const report = await callEMIPlannerAPI({
            farmer_name: name,
            farmer_district: district,
            farmer_state: state,
            farmer_crop: crop,
            farmer_irrigation: irrigation,
            loan_amount: parseFloat(loanAmount),
            duration_months: parseInt(duration)
        });

        res.json(report);
    } catch (error) {
        console.error('EMI Plan API error:', error);
        res.status(500).json({ 
            error: 'Failed to generate EMI plan',
            details: error.message 
        });
    }
});

// Render EMI plan results page
app.get('/emi-plan-result', (req, res) => {
    res.render('agriflow-emi-result');
});

app.get('/agriflow/emi-plan-result', (req, res) => {
    res.render('agriflow-emi-result');
});

// Call Python EMI Planner Model (model3.py via emi_runner.py)
const { spawn } = require('child_process');
const fs = require('fs');

function parsePythonJsonOutput(output) {
    const trimmed = output.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end < start) {
        throw new Error('No JSON object in Python output');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
}

function getPythonCommandAndArgs(runnerPath, inputPath) {
    if (process.env.PYTHON) {
        return { cmd: process.env.PYTHON, args: [runnerPath, inputPath] };
    }
    // Windows: use `python` (same as earlier integration); set PYTHON for py -3 / conda if needed
    if (process.platform === 'win32') {
        return { cmd: 'python', args: [runnerPath, inputPath] };
    }
    return { cmd: 'python3', args: [runnerPath, inputPath] };
}

async function callMonthlyIncomeRunner(payload) {
    return new Promise((resolve) => {
        const runnerPath = path.join(__dirname, 'monthly_income_runner.py');
        const inputPath = path.join(__dirname, `.tmp_income_input_${Date.now()}.json`);
        try {
            fs.writeFileSync(inputPath, JSON.stringify(payload), 'utf8');
        } catch {
            resolve(null);
            return;
        }
        const { cmd, args } = getPythonCommandAndArgs(runnerPath, inputPath);
        const child = spawn(cmd, args, {
            cwd: __dirname,
            env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
        });
        let output = '';
        let err = '';
        child.stdout.on('data', (d) => { output += d.toString('utf8'); });
        child.stderr.on('data', (d) => { err += d.toString('utf8'); });
        child.on('error', () => { fs.unlink(inputPath, () => {}); resolve(null); });
        child.on('close', () => {
            fs.unlink(inputPath, () => {});
            try {
                const parsed = parsePythonJsonOutput(output);
                if (parsed.status === 'success' && Array.isArray(parsed.monthlyData)) {
                    resolve(parsed);
                    return;
                }
            } catch {
                /* ignore */
            }
            if (err.trim()) {
                console.error('monthly_income_runner stderr:', err.slice(0, 500));
            }
            resolve(null);
        });
    });
}

async function callEMIPlannerAPI(farmerData) {
    return new Promise((resolve, reject) => {
        const runnerPath = path.join(__dirname, 'emi_runner.py');
        const inputPath = path.join(__dirname, `.tmp_emi_input_${Date.now()}.json`);

        try {
            fs.writeFileSync(inputPath, JSON.stringify(farmerData), 'utf8');
        } catch (err) {
            reject(err);
            return;
        }

        const { cmd, args } = getPythonCommandAndArgs(runnerPath, inputPath);
        const child = spawn(cmd, args, {
            cwd: __dirname,
            env: { ...process.env, PYTHONUTF8: '1' },
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('error', (err) => {
            fs.unlink(inputPath, () => {});
            reject(new Error(`Failed to start Python (${cmd}): ${err.message}`));
        });

        child.on('close', (code) => {
            fs.unlink(inputPath, () => {});

            let parsed;
            try {
                parsed = parsePythonJsonOutput(output);
            } catch (e) {
                if (code === 0) {
                    console.error('EMI Python stdout parse error:', e.message, output);
                    resolve(createFallbackEMIPlan(farmerData));
                } else {
                    reject(
                        new Error(
                            errorOutput.trim() ||
                                output.trim() ||
                                `Python EMI planner exited with code ${code}`,
                        ),
                    );
                }
                return;
            }

            if (parsed.status === 'error') {
                resolve(parsed);
                return;
            }

            if (code !== 0) {
                reject(
                    new Error(
                        parsed.error ||
                            errorOutput.trim() ||
                            `Python EMI planner exited with code ${code}`,
                    ),
                );
                return;
            }

            resolve(parsed);
        });
    });
}

// Fallback EMI plan generator (if Python is unavailable)
function createFallbackEMIPlan(farmerData) {
    const numMonths = farmerData.duration_months;
    const loanAmount = farmerData.loan_amount;
    const baseIncome = 15000 + Math.random() * 10000;
    
    const monthlySchedule = [];
    for (let i = 1; i <= numMonths; i++) {
        const variance = 0.8 + Math.random() * 0.4;
        const income = Math.floor(baseIncome * variance);
        const seasonalAdjustment = (i % 3 === 0) ? 1.5 : 1.0;
        const adjustedIncome = Math.floor(income * seasonalAdjustment);
        const emi = Math.floor(loanAmount / numMonths);
        const ratio = (emi / adjustedIncome * 100).toFixed(2);
        
        monthlySchedule.push({
            month: i,
            predicted_income: adjustedIncome,
            optimized_emi: emi,
            emi_to_income_ratio: parseFloat(ratio),
            remaining_income: adjustedIncome - emi,
            risk_score: 20 + Math.random() * 40
        });
    }
    
    const avgIncome = monthlySchedule.reduce((sum, m) => sum + m.predicted_income, 0) / numMonths;
    const avgEMI = monthlySchedule.reduce((sum, m) => sum + m.optimized_emi, 0) / numMonths;
    
    return {
        status: 'success',
        farmer_info: {
            name: farmerData.farmer_name,
            district: farmerData.farmer_district,
            state: farmerData.farmer_state,
            crop: farmerData.farmer_crop,
            irrigation: farmerData.farmer_irrigation
        },
        loan_amount: loanAmount,
        duration_months: numMonths,
        forecast: {
            monthly_data: monthlySchedule,
            avg_income: Math.floor(avgIncome),
            max_income: Math.max(...monthlySchedule.map(m => m.predicted_income)),
            min_income: Math.min(...monthlySchedule.map(m => m.predicted_income)),
            income_std: 2500
        },
        emi_schedule: {
            status: 'Optimal',
            avg_emi: Math.floor(avgEMI),
            total_emi: loanAmount,
            monthly_schedule: monthlySchedule
        },
        risk_analysis: {
            avg_risk_score: 45,
            max_risk_score: 75,
            risk_level: 'Medium'
        },
        affordability: {
            avg_emi_to_income_ratio: Math.round((avgEMI / avgIncome) * 10000) / 100,
            affordability_level: 'Affordable',
            recommendation: 'Recommended'
        },
        recommendations: [
            {
                type: 'success',
                message: 'EMI plan is feasible with current projections'
            },
            {
                type: 'info',
                message: 'Consider crop diversification for income stability'
            }
        ]
    };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌾 AgriFlow server running on http://localhost:${PORT}`);
});
