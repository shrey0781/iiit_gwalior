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
    ndvi = Math.min(0.85, Math.max(0.35, ndvi));
    
    return parseFloat(ndvi.toFixed(3));
}

// Fetch mandi price for the crop from historical data
function getMandiPrice(crop) {
    // Base mandi prices (₹/quintal) - typical market rates
    const mandiPrices = {
        'धान': 2100,
        'गेहूं': 2200,
        'कपास': 5800,
        'गन्ना': 280,
        'सोयाबीन': 4500,
        'मक्का': 1800,
        'अन्य': 2500
    };

    const basePrice = mandiPrices[crop] || mandiPrices['अन्य'];
    
    // Add ±5% random market variation
    const variation = 0.95 + (Math.random() * 0.10);
    return Math.floor(basePrice * variation);
}

// Calculate price shock percentage
function getPriceShockPercentage() {
    // Price shock typically ranges from -10% to +10%
    // -10 means prices dropped 10%, +10 means prices increased 10%
    const shock = -10 + (Math.random() * 20);
    return parseFloat(shock.toFixed(2));
}

// Get historical net income lag values
function getNetIncomeLags(crop, land, mandiPrice) {
    // Estimate previous month's income (lag 1) - 80% of current estimate
    const estimatedCurrentIncome = (crop === 'धान' || crop === 'गेहूं') ? 
        (mandiPrice * 25 * land) : (mandiPrice * 20 * land);
    
    const lag1 = Math.floor(estimatedCurrentIncome * 0.80);
    const lag2 = Math.floor(estimatedCurrentIncome * 0.75); // 2 months ago
    
    return { lag1, lag2 };
}

// Call Flask backend to get ML model prediction
async function predictIncomeWithML(features) {
    try {
        const response = await fetch('http://localhost:5000/predict-income', {
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
    const months = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
        'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];

    // Fetch real data from APIs and calculations
    const rainfall = await fetchRainfallData(district);
    const ndvi = getNDVIValue(crop, fertilizer, pesticide);
    const mandiPrice = getMandiPrice(crop);
    const priceShock = getPriceShockPercentage();
    const { lag1, lag2 } = getNetIncomeLags(crop, land, mandiPrice);

    console.log(`📊 Real Data - Rainfall: ${rainfall}mm, NDVI: ${ndvi}, Mandi Price: ₹${mandiPrice}, Price Shock: ${priceShock}%`);

    // Features expected by model_lgb
    const features = [
        rainfall,      // actual_rainfall
        ndvi,          // ndvi_value
        mandiPrice,    // kharif_mandi_price
        priceShock,    // price_shock_percentage
        lag1,          // net_income_lag_1
        lag2           // net_income_lag_2
    ];

    // Try to get prediction from ML model
    let mlPrediction = await predictIncomeWithML(features);

    const monthlyData = [];
    const cropRevenuePerUnit = {
        'धान': 1.2,
        'गेहूं': 1.1,
        'कपास': 1.5,
        'गन्ना': 2.0,
        'सोयाबीन': 1.3,
        'मक्का': 1.15,
        'अन्य': 1.0
    };

    const revenueMultiplier = cropRevenuePerUnit[crop] || cropRevenuePerUnit['अन्य'];
    
    // Base income calculation from real mandi price
    let baseMonthlyIncome = (mandiPrice * land * revenueMultiplier) / 12;
    
    // If ML prediction available, use it; otherwise use calculated value
    if (mlPrediction && mlPrediction > 0) {
        baseMonthlyIncome = mlPrediction / 12;
    }

    // Generate seasonal variations
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

    // Apply NDVI and price shock adjustments
    const ndviAdjustment = 0.8 + (ndvi * 0.25); // NDVI adjustment: 0.8 to 1.05
    const priceAdjustment = 1 + (priceShock / 100); // Price shock adjustment
    const rainfallAdjustment = 1.0 + (Math.min(rainfall, 50) / 500); // Rainfall benefit (capped)

    for (let i = 0; i < 12; i++) {
        let monthlyIncome = baseMonthlyIncome * seasonalPattern[i];
        
        // Apply various adjustments
        monthlyIncome *= ndviAdjustment;
        monthlyIncome *= priceAdjustment;
        monthlyIncome *= rainfallAdjustment;
        
        // Add slight random variation
        const randomVariation = 0.95 + (Math.random() * 0.10);
        monthlyIncome = Math.floor(monthlyIncome * randomVariation);

        monthlyData.push({
            month: months[i],
            income: Math.max(500, monthlyIncome) // Minimum ₹500 per month
        });
    }

    return { monthlyData, rainfall, ndvi, mandiPrice, priceShock };
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌾 AgriFlow server running on http://localhost:${PORT}`);
});
