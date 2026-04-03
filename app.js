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
