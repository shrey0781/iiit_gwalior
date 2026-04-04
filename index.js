const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");

const app = express();

connectDB();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

app.get("/", (req, res) => {
  res.render("index")
})

// ==================== AgriFlow Routes ====================

// Home Page
app.get("/agriflow", (req, res) => {
  res.render("agriflow-index");
});

// Application Form
app.get("/agriflow/apply", (req, res) => {
  res.render("agriflow-form");
});

// Result Page
app.post("/agriflow/result", (req, res) => {
  // Calculate risk score based on loan & land
  const land = parseFloat(req.body.land) || 5;
  const loan = parseFloat(req.body.loan) || 150000;
  const loanToLandRatio = loan / land;

  let riskScore = Math.min(90, Math.floor((loanToLandRatio / 50000) * 50) + Math.random() * 20);
  let riskLevel = "Low";
  let riskEmoji = "✅";

  if (riskScore > 65) {
    riskLevel = "High";
    riskEmoji = "⚠️";
  } else if (riskScore > 40) {
    riskLevel = "Medium";
    riskEmoji = "⚡";
  }

  const monthlyIncome = [4500, 4200, 8500, 12500, 13000, 5500, 4800, 4500, 5200, 14500, 15000, 6500];
  const monthlyEMI = Math.floor(loan / 48);

  const farmer = {
    name: req.body.name || "राज कुमार",
    district: req.body.district || "छत्तीसगढ़",
    crop: req.body.crop || "धान",
    land: land,
    loan: loan,
    duration: req.body.duration || "24 months",
    riskLevel: riskLevel,
    riskEmoji: riskEmoji,
    riskScore: Math.floor(riskScore),
    monthlyEMI: monthlyEMI,
    bestSellMonth: "मार्च / March",
    monthlyIncome: monthlyIncome,
    emiPlan: generateEMIPlan(monthlyEMI, monthlyIncome)
  };

  res.render("agriflow-result", { farmer });
});

// Helper function to generate EMI plan
function generateEMIPlan(emiAmount, incomeMonths) {
  const months = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"];
  const monthsEng = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const plan = [];
  for (let i = 0; i < 12; i++) {
    const income = incomeMonths[i];
    const emiPercent = (emiAmount / income) * 100;
    let status = "safe";
    let statusEmoji = "✅";

    if (emiPercent > 40) {
      status = "high";
      statusEmoji = "⚠️";
    } else if (emiPercent > 30) {
      status = "medium";
      statusEmoji = "⚡";
    }

    plan.push({
      month: months[i],
      monthEng: monthsEng[i],
      income: income,
      emi: emiAmount,
      percent: Math.floor(emiPercent),
      status: status,
      emoji: statusEmoji
    });
  }
  return plan;
}

// ==================== Weather & Location Route ====================

// Weather, Rainfall, and Soil Type Page
app.get("/agriflow/weather", (req, res) => {
  // Dummy location data - in production, this would come from geolocation API
  const weatherData = {
    location: {
      city: "Indore",
      state: "Madhya Pradesh",
      latitude: 22.7196,
      longitude: 75.8577,
      district: "Indore"
    },
    weather: {
      temperature: 32,
      humidity: 65,
      windSpeed: 15,
      condition: "Partly Cloudy",
      feelsLike: 34,
      uvIndex: 8,
      visibility: 10,
      pressure: 1013
    },
    rainfall: {
      today: 0,
      thisWeek: 5.2,
      thisMonth: 45.6,
      lastMonth: 120.5,
      forecast: [
        { day: "Thursday", rainfall: "0mm", chance: "10%" },
        { day: "Friday", rainfall: "2mm", chance: "20%" },
        { day: "Saturday", rainfall: "15mm", chance: "60%" },
        { day: "Sunday", rainfall: "8mm", chance: "45%" },
        { day: "Monday", rainfall: "0mm", chance: "5%" }
      ]
    },
    soil: {
      type: "Alluvial Soil",
      pH: 6.8,
      nitrogen: "High",
      phosphorus: "Medium",
      potassium: "Medium",
      organic_matter: "3.2%",
      color: "Brown",
      texture: "Loam",
      fertility: "Good",
      recommendations: [
        "उचित जल निकास सुनिश्चित करें / Ensure proper drainage",
        "गर्मी के मौसम में सिंचाई बढ़ाएँ / Increase irrigation in summer",
        "नाइट्रोजन की मात्रा संतुलित रखें / Maintain nitrogen balance",
        "कार्बनिक खाद का उपयोग करें / Use organic fertilizers"
      ]
    },
    airQuality: {
      index: 145,
      level: "Moderate",
      pm25: 52,
      pm10: 98,
      no2: 35,
      so2: 12
    },
    season: {
      current: "Kharif",
      bestCrops: ["धान (Rice)", "सोयाबीन (Soybean)", "मक्का (Maize)"],
      waterNeeds: "High"
    }
  };

  res.render("agriflow-weather", { weatherData });
});

// Weather API endpoint (for AJAX calls)
app.get("/api/weather", (req, res) => {
  // This would be called from the frontend with geolocation data
  const { latitude, longitude } = req.query;

  // Dummy API response
  const weatherResponse = {
    status: "success",
    location: {
      city: "Indore",
      latitude: parseFloat(latitude) || 22.7196,
      longitude: parseFloat(longitude) || 75.8577
    },
    weather: {
      temperature: 32 + Math.floor(Math.random() * 5),
      humidity: 60 + Math.floor(Math.random() * 20),
      windSpeed: 10 + Math.floor(Math.random() * 15),
      condition: "Partly Cloudy"
    },
    rainfall: {
      today: Math.floor(Math.random() * 5),
      thisWeek: 5.2,
      thisMonth: 45.6
    }
  };

  res.json(weatherResponse);
});

// ==================== AI CHAT ROUTE ====================

// Chat Page
app.get("/agriflow/chat", (req, res) => {
  res.render("agriflow-chat");
});

// Chat Test Page (for debugging)
app.get("/agriflow/chat-test", (req, res) => {
  res.render("chat-test");
});

// Chat API endpoint - DeepSeek R1 via OpenRouter
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required" });
    }

    const apiKey = "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";
    const apiUrl = "https://openrouter.ai/api/v1/chat/completions";

    // Context for the AI - Agricultural advisor role
    const systemPrompt = `You are AgriFlow's AI Agricultural Advisor. You are a helpful, friendly assistant for Indian farmers.

Your responsibilities:
1. Answer questions about farming, crops, weather, and soil management
2. Provide practical farming tips and best practices
3. Help with loan and agriculture finance questions
4. Explain agricultural concepts in simple language
5. Give actionable advice for crop cultivation and irrigation
6. Suggest sustainable farming methods
7. Help with pest management and crop insurance information

Instructions:
- Always respond in clear, simple English
- Be warm and encouraging
- Understand farmer challenges and provide practical solutions
- Keep responses concise and informative (2-3 paragraphs max)
- If you don't know something, ask the user for more details
- Always aim to help Indian farmers succeed`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AgriFlow"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    console.log("API Response Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenRouter API Error:", JSON.stringify(errorData, null, 2));
      return res.status(response.status).json({
        error: "Unable to get response from AI",
        details: errorData.error?.message || "API Error"
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that. Please try again.";

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
});

// ==================== Monthly Income Prediction Routes ====================

// Monthly Income Page
app.get("/agriflow/monthly-income", (req, res) => {
  res.render("agriflow-income");
});

// Monthly Income Result
app.post("/agriflow/monthly-income/result", async (req, res) => {
  try {
    const name = req.body.name || "राज कुमार";
    const district = req.body.district || "विदिशा";
    const crop = req.body.crop || "गेहूं";
    const land = parseFloat(req.body.land) || 4;
    const fertilizer = parseFloat(req.body.fertilizer) || 200;
    const waterSource = req.body.water_source || "बोरवेल";
    const pesticide = parseFloat(req.body.pesticide) || 5;

    // Generate monthly income prediction
    const { monthlyData, rainfall, ndvi, mandiPrice, priceShock } = await generateMonthlyIncome(
      crop, land, fertilizer, pesticide, district
    );

    const incomeValues = monthlyData.map(m => m.income);
    const averageMonthlyIncome = Math.floor(incomeValues.reduce((a, b) => a + b, 0) / 12);
    const maxIncome = Math.max(...incomeValues);
    const minIncome = Math.min(...incomeValues);

    const bestMonthIndex = incomeValues.indexOf(maxIncome);
    const lowestMonthIndex = incomeValues.indexOf(minIncome);

    const monthNames = [
      "जनवरी / January", "फरवरी / February", "मार्च / March", "अप्रैल / April",
      "मई / May", "जून / June", "जुलाई / July", "अगस्त / August",
      "सितम्बर / September", "अक्टूबर / October", "नवम्बर / November", "दिसम्बर / December"
    ];

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
      rainfall: rainfall,
      ndvi: ndvi,
      mandiPrice: mandiPrice,
      priceShock: priceShock
    };

    res.render("agriflow-income-result", { farmer });
  } catch (error) {
    console.error("Error in income prediction:", error);
    res.status(500).send("Error processing income prediction");
  }
});

// ==================== Helper Functions ====================

async function generateMonthlyIncome(crop, land, fertilizer, pesticide, district) {
  const months = [
    "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"
  ];

  const rainfall = await fetchRainfallData(district);
  const ndvi = getNDVIValue(crop, fertilizer, pesticide);
  const mandiPrice = getMandiPrice(crop);
  const priceShock = getPriceShockPercentage();
  const { lag1, lag2 } = getNetIncomeLags(crop, land, mandiPrice);

  const features = [rainfall, ndvi, mandiPrice, priceShock, lag1, lag2];
  let mlPrediction = await predictIncomeWithML(features);

  const monthlyData = [];
  const cropRevenuePerUnit = {
    "धान": 1.2,
    "गेहूं": 1.1,
    "कपास": 1.5,
    "गन्ना": 2.0,
    "सोयाबीन": 1.3,
    "मक्का": 1.15,
    "अन्य": 1.0
  };

  const revenueMultiplier = cropRevenuePerUnit[crop] || cropRevenuePerUnit["अन्य"];
  let baseMonthlyIncome = (mandiPrice * land * revenueMultiplier) / 12;

  if (mlPrediction && mlPrediction > 0) {
    baseMonthlyIncome = mlPrediction / 12;
  }

  const seasonalPatterns = {
    "धान": [0.8, 0.7, 0.6, 0.5, 0.6, 1.2, 1.5, 1.8, 1.9, 1.5, 0.9, 0.8],
    "गेहूं": [0.6, 0.6, 0.7, 1.0, 1.5, 1.8, 1.9, 1.5, 0.8, 0.7, 0.6, 0.5],
    "कपास": [0.7, 0.8, 0.9, 1.2, 1.5, 1.7, 1.6, 1.4, 1.0, 0.8, 0.6, 0.5],
    "गन्ना": [1.0, 1.0, 1.0, 1.0, 1.1, 1.2, 1.3, 1.3, 1.2, 1.0, 0.9, 0.9],
    "सोयाबीन": [0.7, 0.8, 0.9, 1.2, 1.6, 1.8, 1.7, 1.4, 0.9, 0.7, 0.6, 0.5],
    "मक्का": [0.7, 0.8, 0.8, 1.1, 1.5, 1.8, 1.9, 1.6, 0.9, 0.7, 0.6, 0.5],
    "अन्य": [0.8, 0.8, 0.8, 1.0, 1.2, 1.3, 1.3, 1.2, 0.9, 0.8, 0.8, 0.8]
  };

  const seasonalPattern = seasonalPatterns[crop] || seasonalPatterns["अन्य"];
  const ndviAdjustment = 0.8 + ndvi * 0.25;
  const priceAdjustment = 1 + priceShock / 100;
  const rainfallAdjustment = 1.0 + Math.min(rainfall, 50) / 500;

  for (let i = 0; i < 12; i++) {
    let monthlyIncome = baseMonthlyIncome * seasonalPattern[i];
    monthlyIncome *= ndviAdjustment;
    monthlyIncome *= priceAdjustment;
    monthlyIncome *= rainfallAdjustment;

    const randomVariation = 0.95 + Math.random() * 0.1;
    monthlyIncome = Math.floor(monthlyIncome * randomVariation);

    monthlyData.push({
      month: months[i],
      income: Math.max(500, monthlyIncome)
    });
  }

  return { monthlyData, rainfall, ndvi, mandiPrice, priceShock };
}

async function fetchRainfallData(district) {
  try {
    const apiKey = process.env.WEATHER_API_KEY || "demo_key";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${district}&appid=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.rain ? data.rain["1h"] || 0 : 0;
  } catch (error) {
    console.log("Rain fetch error:", error.message);
    return 5;
  }
}

function getNDVIValue(crop, fertilizer, pesticide) {
  const cropNDVIBase = {
    "धान": 0.65,
    "गेहूं": 0.60,
    "कपास": 0.58,
    "गन्ना": 0.68,
    "सोयाबीन": 0.62,
    "मक्का": 0.64,
    "अन्य": 0.60
  };

  let ndvi = cropNDVIBase[crop] || cropNDVIBase["अन्य"];
  if (fertilizer > 200) ndvi += 0.05;
  if (pesticide > 5) ndvi += 0.03;
  ndvi = Math.min(0.85, Math.max(0.35, ndvi));
  return parseFloat(ndvi.toFixed(3));
}

function getMandiPrice(crop) {
  const mandiPrices = {
    "धान": 2100,
    "गेहूं": 2200,
    "कपास": 5800,
    "गन्ना": 280,
    "सोयाबीन": 4500,
    "मक्का": 1800,
    "अन्य": 2500
  };

  const basePrice = mandiPrices[crop] || mandiPrices["अन्य"];
  const variation = 0.95 + Math.random() * 0.1;
  return Math.floor(basePrice * variation);
}

function getPriceShockPercentage() {
  const shock = -10 + Math.random() * 20;
  return parseFloat(shock.toFixed(2));
}

function getNetIncomeLags(crop, land, mandiPrice) {
  const estimatedCurrentIncome =
    crop === "धान" || crop === "गेहूं"
      ? mandiPrice * 25 * land
      : mandiPrice * 20 * land;

  const lag1 = Math.floor(estimatedCurrentIncome * 0.8);
  const lag2 = Math.floor(estimatedCurrentIncome * 0.75);
  return { lag1, lag2 };
}

async function predictIncomeWithML(features) {
  try {
    const response = await fetch("http://localhost:5000/predict-income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: features })
    });

    if (!response.ok) {
      console.log("ML prediction error, using fallback");
      return null;
    }

    const data = await response.json();
    return data.predicted_income;
  } catch (error) {
    console.log("Flask backend unavailable:", error.message);
    return null;
  }
}

app.use("/", authRoutes);

app.listen(3000, () => {
  console.log("🌾 AgriFlow Server running on http://localhost:3000");
});