const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const bodyParser = require("body-parser");
const session = require("express-session");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const Notification = require("./models/Notification");
const SmartAlertEngine = require("./services/SmartAlertEngine");
const WeatherAlertService = require("./services/WeatherAlertService");

const app = express();

connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.json()); // Parse JSON requests
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

// ==================== Helper Function: Get Data for ML Model ====================

function getAgricultureData(crop, district) {
  // Realistic agricultural data based on crop and typical conditions
  const cropData = {
    "धान": { rainfall: 120, ndvi: 0.65, mandiPrice: 2100, priceShock: 2.5 },
    "गेहूं": { rainfall: 60, ndvi: 0.60, mandiPrice: 2200, priceShock: 1.8 },
    "कपास": { rainfall: 100, ndvi: 0.58, mandiPrice: 5800, priceShock: 3.2 },
    "गन्ना": { rainfall: 150, ndvi: 0.68, mandiPrice: 280, priceShock: 2.0 },
    "सोयाबीन": { rainfall: 90, ndvi: 0.62, mandiPrice: 3500, priceShock: 2.8 },
    "मक्का": { rainfall: 85, ndvi: 0.64, mandiPrice: 1800, priceShock: 2.2 },
    "अन्य": { rainfall: 100, ndvi: 0.60, mandiPrice: 2500, priceShock: 2.5 }
  };

  const data = cropData[crop] || cropData["अन्य"];
  // Add ±10% variation for realistic data
  const variation = 0.90 + (Math.random() * 0.20);
  // model1.py: price_shock_pct = mandi pct_change (decimal, e.g. 0.025 = +2.5%)
  const shockDecimal = (data.priceShock / 100) * variation;
  return {
    rainfall: Math.floor(data.rainfall * variation),
    ndvi: parseFloat((data.ndvi * variation).toFixed(3)),
    mandiPrice: Math.floor(data.mandiPrice * variation),
    priceShock: parseFloat(shockDecimal.toFixed(4))
  };
}

// ==================== Helper Function: Call ML Model for Income Prediction ====================

async function predictIncomeFromML(land, crop, district) {
  try {
    const agData = getAgricultureData(crop, district);

    // model1: [actual_rainfall_mm, ndvi, kharif_mandi_price, price_shock_pct, net_income_lag1, net_income_lag2]
    // Target is monthly net_income (training CSV)
    const { lag1: income_lag_1, lag2: income_lag_2 } = getNetIncomeLags(
      crop,
      land,
      agData.mandiPrice
    );

    const features = [
      agData.rainfall,
      agData.ndvi,
      agData.mandiPrice,
      agData.priceShock,
      income_lag_1,
      income_lag_2
    ];

    console.log(`🤖 Calling ML Model with features:`, features);

    const baseUrl = process.env.FLASK_ML_URL || "http://127.0.0.1:5000";
    const response = await fetch(`${baseUrl}/predict-income`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: features })
    });

    if (response.ok) {
      const data = await response.json();
      const monthlyNet = data.predicted_income || 0;
      console.log(`✅ ML monthly net income: ₹${monthlyNet.toLocaleString()}`);

      // Annual estimate for loan flow: 12 × monthly net (model1 predicts one month)
      const annual = Math.floor(Math.max(0, monthlyNet) * 12);
      return Math.max(12000, annual);
    } else {
      console.log("❌ ML API error, will use fallback");
      return null;
    }
  } catch (error) {
    console.log(`⚠️ ML Backend unavailable (${error.message}), using fallback calculation`);
    return null;
  }
}

// ==================== Helper Function: Calculate Monthly Income with Seasonal Variation ====================

function distributIncomeMonthly(annualIncome, crop) {
  const monthlyData = [];

  // Seasonal distribution patterns for each crop
  const seasonalPatterns = {
    "धान": [0.02, 0.02, 0.05, 0.08, 0.15, 0.25, 0.40, 0.60, 0.85, 1.20, 1.40, 0.50],
    "गेहूं": [0.40, 0.60, 0.80, 1.00, 0.50, 0.15, 0.08, 0.05, 0.05, 0.20, 1.05, 1.20],
    "कपास": [0.05, 0.08, 0.15, 0.30, 0.60, 1.00, 1.30, 1.40, 1.00, 0.40, 0.10, 0.05],
    "गन्ना": [1.00, 1.00, 1.00, 1.00, 0.80, 0.60, 0.50, 0.50, 0.60, 0.80, 1.10, 1.20],
    "सोयाबीन": [0.05, 0.10, 0.20, 0.40, 0.70, 1.10, 1.30, 1.20, 0.70, 0.25, 0.10, 0.05],
    "मक्का": [0.08, 0.12, 0.25, 0.50, 0.80, 1.15, 1.40, 1.25, 0.60, 0.20, 0.10, 0.05],
    "अन्य": [0.30, 0.40, 0.50, 0.70, 0.80, 0.90, 1.00, 1.00, 0.90, 0.80, 0.70, 0.50]
  };

  const pattern = seasonalPatterns[crop] || seasonalPatterns["अन्य"];

  for (let i = 0; i < 12; i++) {
    const monthlyValue = Math.floor((annualIncome * pattern[i]) / 12);
    const withVariation = Math.floor(monthlyValue * (0.95 + Math.random() * 0.10)); // ±5% variation
    monthlyData.push(Math.max(2000, withVariation)); // Minimum ₹2000 per month
  }

  return monthlyData;
}

// ==================== Result Page ====================

// Result Page - Now Async to use ML Model for Income Prediction
app.post("/agriflow/result", async (req, res) => {
  try {
    // Get form inputs
    const land = parseFloat(req.body.land) || 5;
    const loan = parseFloat(req.body.loan) || 150000;
    const crop = req.body.crop || "धान";
    const duration = req.body.duration || "24 months";
    const district = req.body.district || "छत्तीसगढ़";
    const loanToLandRatio = loan / land;

    // Extract number of months from duration string (e.g., "24 months" → 24)
    const durationMonths = parseInt(duration) || 24;

    // ============ NEW: Get ML Model Prediction for Annual Income ============
    console.log(`🌾 Processing loan for ${land} acres of ${crop}...`);

    let annualIncome = await predictIncomeFromML(land, crop, district);

    // If ML model is unavailable, use fallback formula
    if (!annualIncome) {
      console.log(`📊 Using fallback income calculation (ML unavailable)`);
      const cropBaseIncome = {
        "धान": 48000, "गेहूं": 44000, "कपास": 87000,
        "गन्ना": 56000, "सोयाबीन": 54000, "मक्का": 36000, "अन्य": 40000
      };
      const basePerAcre = cropBaseIncome[crop] || 40000;
      annualIncome = Math.floor(basePerAcre * land * 1.2); // 20% multiplier for realistic scale
    }

    // Distribute annual income across 12 months with seasonal patterns
    const monthlyIncome = distributIncomeMonthly(annualIncome, crop);
    console.log(`📈 Monthly Income Range: ₹${Math.min(...monthlyIncome).toLocaleString()} to ₹${Math.max(...monthlyIncome).toLocaleString()}`);

    // Calculate EMI: Total Loan ÷ Number of Months
    const monthlyEMI = Math.floor(loan / durationMonths);

    // Calculate average monthly income and EMI burden
    const averageMonthlyIncome = Math.floor(monthlyIncome.reduce((a, b) => a + b, 0) / monthlyIncome.length);
    const emiPercentageAvg = (monthlyEMI / averageMonthlyIncome) * 100;

    // Calculate worst-case EMI percentage (lowest income month)
    const lowestIncome = Math.min(...monthlyIncome);
    const emiPercentageWorst = (monthlyEMI / lowestIncome) * 100;

    // Calculate risk score based on BOTH loan-to-land ratio AND EMI burden
    let riskScore = 0;

    // Factor 1: Loan-to-Land Ratio (0-30 points) - Decreased importance
    const loanToLandRisk = Math.min(30, Math.floor((loanToLandRatio / 50000) * 30));

    // Factor 2: EMI Burden - Most important (0-50 points)
    // Apply duration discount: Longer loans = lower risk
    let emiRisk = 0;

    // Duration discount factor
    // 12 months = 1.0x (no discount)
    // 24 months = 0.75x (25% reduction)
    // 36 months = 0.60x (40% reduction)
    const durationDiscount = Math.max(0.60, 1.0 - (durationMonths - 12) * 0.01);
    const adjustedEmiPercentageWorst = emiPercentageWorst * durationDiscount;

    if (adjustedEmiPercentageWorst > 50) {
      emiRisk = 50; // Very high risk
    } else if (adjustedEmiPercentageWorst > 40) {
      emiRisk = 42; // High risk
    } else if (adjustedEmiPercentageWorst > 30) {
      emiRisk = 30; // Medium risk
    } else if (adjustedEmiPercentageWorst > 20) {
      emiRisk = 18; // Low-medium risk
    } else if (adjustedEmiPercentageWorst > 10) {
      emiRisk = 8; // Low risk
    } else {
      emiRisk = 3; // Very low risk
    }

    // Factor 3: Duration benefit bonus (0-20 points) - Longer durations are actually safer
    let durationBonus = 0;
    if (durationMonths >= 36) {
      durationBonus = 20; // 36+ months: significant safety bonus
    } else if (durationMonths >= 24) {
      durationBonus = 12; // 24 months: moderate safety bonus
    } else if (durationMonths >= 18) {
      durationBonus = 6; // 18 months: small safety bonus
    }

    // Total risk score (0-100)
    riskScore = Math.min(100, Math.max(0, loanToLandRisk + emiRisk - durationBonus));

    if (riskScore > 65) {
      riskLevel = "High";
      riskEmoji = "⚠️";
    } else if (riskScore > 40) {
      riskLevel = "Medium";
      riskEmoji = "⚡";
    }

    // Calculate total interest (approximate - assuming 10% annual interest)
    const annualInterestRate = 0.10;
    const totalInterest = Math.floor(loan * annualInterestRate * (durationMonths / 12));

    const farmer = {
      name: req.body.name || "राज कुमार",
      district: req.body.district || "छत्तीसगढ़",
      crop: req.body.crop || "धान",
      land: land,
      loan: loan,
      duration: duration,
      durationMonths: durationMonths,
      riskLevel: riskLevel,
      riskEmoji: riskEmoji,
      riskScore: Math.floor(riskScore),
      monthlyEMI: monthlyEMI,
      totalInterest: totalInterest,
      totalAmount: loan + totalInterest,
      bestSellMonth: "मार्च / March",
      monthlyIncome: monthlyIncome,
      averageMonthlyIncome: averageMonthlyIncome,
      lowestIncome: lowestIncome,
      emiPercentageAvg: Math.floor(emiPercentageAvg),
      emiPercentageWorst: Math.floor(emiPercentageWorst),
      adjustedEmiPercentageWorst: Math.floor(adjustedEmiPercentageWorst),
      durationDiscount: (durationDiscount * 100).toFixed(0),
      emiPlan: generateEMIPlan(monthlyEMI, monthlyIncome, durationMonths)
    };

    res.render("agriflow-result", { farmer });
  } catch (error) {
    console.error("❌ Error in /agriflow/result:", error);
    res.status(500).json({ error: "Failed to process loan application", details: error.message });
  }
});

// Helper function to generate EMI plan based on actual duration
function generateEMIPlan(emiAmount, incomeMonths, durationMonths) {
  const months = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"];
  const monthsEng = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const plan = [];

  // If duration is less than 12 months, show all months; otherwise show 12 months
  const monthsToShow = Math.min(durationMonths, 12);

  for (let i = 0; i < monthsToShow; i++) {
    // Cycle through income months if duration > 12 months (repeat the pattern)
    const incomeIndex = i % incomeMonths.length;
    const income = incomeMonths[incomeIndex];
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
      monthNumber: i + 1,
      income: income,
      emi: emiAmount,
      percent: Math.floor(emiPercent),
      status: status,
      emoji: statusEmoji
    });
  }

  // If duration > 12, show remaining months with note
  if (durationMonths > 12) {
    const remainingMonths = durationMonths - 12;
    plan.remainingMonths = remainingMonths;
    plan.totalMonths = durationMonths;
  }

  return plan;
}

// ===== REAL WEATHER API INTEGRATION WITH PROVIDED API KEY =====
const WEATHER_API_KEY = "837f8e27ea0a6f0a5912dfca0e08e00b";

// Helper: Convert WMO weather code to description
function getWeatherConditionFromCode(code) {
  const weatherCodes = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Foggy",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Heavy Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Slight Showers",
    81: "Moderate Showers",
    82: "Heavy Showers",
    95: "Thunderstorm",
    96: "Slight Thunderstorm",
    99: "Heavy Thunderstorm"
  };
  return weatherCodes[code] || "Cloudy";
}

// Helper: Reverse geocode coordinates to get location name
async function reverseGeocodeCoordinates(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.address) {
        const result = {
          city: data.address.city || data.address.town || data.address.village || "Unknown",
          state: data.address.state || "Unknown",
          country: data.address.country || "India"
        };
        console.log(`✅ Reverse geocoded: ${result.city}, ${result.state}`)
        return result;
      }
    }
  } catch (error) {
    console.log("Reverse geocoding failed:", error.message);
  }
  // Fallback: use nearest city from database
  console.log("⚠️ Using nearest city from database as fallback");
  const nearestCity = getNearestCity(latitude, longitude);
  if (nearestCity) {
    return {
      city: nearestCity.city,
      state: nearestCity.state,
      country: "India"
    };
  }
  return null;
}

// Helper: Fetch real weather data from API
async function fetchRealWeatherFromAPI(latitude, longitude) {
  try {
    console.log(`📍 Fetching real weather for: ${latitude}, ${longitude}`);

    // Try Open-Meteo API first (free, no authentication needed)
    try {
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,pressure_msl,wind_speed_10m,uv_index,visibility,weather_code&timezone=Asia/Kolkata`;

      const response = await fetch(openMeteoUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.current) {
          const current = data.current;
          console.log("✅ Using Open-Meteo weather data (Free API)");

          // Try to get location name via reverse geocoding
          const locationData = await reverseGeocodeCoordinates(latitude, longitude);

          return {
            temperature: Math.round(current.temperature_2m),
            feelsLike: Math.round(current.apparent_temperature),
            humidity: current.relative_humidity_2m,
            windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
            windSpeedKmh: Math.round(current.wind_speed_10m * 3.6 * 10) / 10,
            condition: getWeatherConditionFromCode(current.weather_code),
            description: getWeatherConditionFromCode(current.weather_code),
            uvIndex: Math.round(current.uv_index || 5),
            visibility: Math.round((current.visibility || 10000) / 1000),
            pressure: Math.round(current.pressure_msl || 1013),
            clouds: current.cloud_cover || 20,
            rainfall: current.precipitation || 0,
            isDay: true,
            // Location data from reverse geocoding
            apiLocation: locationData ? {
              city: locationData.city,
              state: locationData.state,
              country: locationData.country,
              lat: latitude,
              lon: longitude
            } : null
          };
        }
      }
    } catch (openMeteoError) {
      console.log("Open-Meteo failed, trying WeatherAPI...");
    }

    // Try WeatherAPI with the provided key
    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&aqi=yes`;

    const response = await fetch(weatherUrl);

    if (response.ok) {
      const data = await response.json();
      if (data.current && data.location) {
        const current = data.current;
        const location = data.location;
        console.log("✅ Using WeatherAPI weather data");
        return {
          temperature: Math.round(current.temp_c),
          feelsLike: Math.round(current.feelslike_c),
          humidity: current.humidity,
          windSpeed: Math.round(current.wind_mps * 10) / 10,
          windSpeedKmh: Math.round(current.wind_kph),
          condition: current.condition.text,
          description: current.condition.text,
          uvIndex: Math.round(current.uv),
          visibility: Math.round(current.vis_km),
          pressure: current.pressure_mb,
          clouds: current.cloud,
          rainfall: current.precip_mm,
          isDay: current.is_day,
          // Real location data from API
          apiLocation: {
            city: location.name,
            state: location.region,
            country: location.country,
            lat: location.lat,
            lon: location.lon
          }
        };
      }
    } else {
      console.log(`WeatherAPI returned status ${response.status}`);
    }

    return null;
  } catch (error) {
    console.error("Weather API error:", error.message);
    return null;
  }
}

// Enhanced: Fetch real weather for location
async function fetchRealWeatherData(latitude, longitude) {
  const realWeather = await fetchRealWeatherFromAPI(latitude, longitude);

  if (realWeather) {
    console.log("✅ Using REAL weather data from API");
    return realWeather;
  }

  console.log("⚠️ API unavailable, using local generation");
  // Fallback to local generation if API fails
  return generateWeatherData(latitude, longitude);
}

// ===== CUSTOM DATABASE - Indian Cities & Regions =====
const indianLocationsDB = [
  { city: "Delhi", state: "Delhi", lat: 28.7041, lon: 77.1025, region: "North" },
  { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lon: 72.8777, region: "West" },
  { city: "Bangalore", state: "Karnataka", lat: 12.9716, lon: 77.5946, region: "South" },
  { city: "Hyderabad", state: "Telangana", lat: 17.3850, lon: 78.4867, region: "South" },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, region: "South" },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639, region: "East" },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567, region: "West" },
  { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lon: 75.8577, region: "Central" },
  { city: "Gwalior", state: "Madhya Pradesh", lat: 26.2389, lon: 78.1639, region: "Central" },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.1815, lon: 79.9864, region: "Central" },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lon: 75.7873, region: "North" },
  { city: "Chandigarh", state: "Punjab", lat: 30.7333, lon: 76.8333, region: "North" },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lon: 80.9462, region: "North" },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lon: 72.5714, region: "West" },
  { city: "Surat", state: "Gujarat", lat: 21.1458, lon: 72.8336, region: "West" },
  { city: "Kochi", state: "Kerala", lat: 9.9312, lon: 76.2673, region: "South" },
  { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6869, lon: 83.2185, region: "East" }
];

// ===== WEATHER PATTERNS BY REGION & SEASON =====
function getWeatherByRegion(region, month) {
  const weatherPatterns = {
    North: {
      winter: { temp: 15, humidity: 50, windSpeed: 20, condition: "Clear" },
      summer: { temp: 38, humidity: 30, windSpeed: 15, condition: "Sunny" },
      monsoon: { temp: 28, humidity: 75, windSpeed: 25, condition: "Cloudy" },
      spring: { temp: 25, humidity: 45, windSpeed: 18, condition: "Partly Cloudy" }
    },
    South: {
      winter: { temp: 28, humidity: 65, windSpeed: 12, condition: "Sunny" },
      summer: { temp: 35, humidity: 55, windSpeed: 18, condition: "Sunny" },
      monsoon: { temp: 26, humidity: 80, windSpeed: 28, condition: "Rainy" },
      spring: { temp: 30, humidity: 60, windSpeed: 14, condition: "Partly Cloudy" }
    },
    East: {
      winter: { temp: 20, humidity: 55, windSpeed: 16, condition: "Clear" },
      summer: { temp: 36, humidity: 45, windSpeed: 14, condition: "Sunny" },
      monsoon: { temp: 27, humidity: 85, windSpeed: 26, condition: "Rainy" },
      spring: { temp: 28, humidity: 60, windSpeed: 16, condition: "Cloudy" }
    },
    West: {
      winter: { temp: 26, humidity: 60, windSpeed: 14, condition: "Clear" },
      summer: { temp: 37, humidity: 40, windSpeed: 16, condition: "Sunny" },
      monsoon: { temp: 25, humidity: 82, windSpeed: 30, condition: "Rainy" },
      spring: { temp: 32, humidity: 55, windSpeed: 15, condition: "Partly Cloudy" }
    },
    Central: {
      winter: { temp: 22, humidity: 52, windSpeed: 18, condition: "Clear" },
      summer: { temp: 40, humidity: 35, windSpeed: 14, condition: "Sunny" },
      monsoon: { temp: 26, humidity: 78, windSpeed: 22, condition: "Cloudy" },
      spring: { temp: 28, humidity: 50, windSpeed: 16, condition: "Partly Cloudy" }
    }
  };

  const getSeason = (m) => {
    if (m >= 0 && m <= 2) return "winter";
    if (m >= 3 && m <= 5) return "summer";
    if (m >= 6 && m <= 9) return "monsoon";
    return "spring";
  };

  const season = getSeason(month);
  const pattern = (weatherPatterns[region] && weatherPatterns[region][season]) || weatherPatterns.Central.spring;

  // Add randomness
  return {
    temperature: pattern.temp + Math.floor(Math.random() * 6) - 3,
    humidity: pattern.humidity + Math.floor(Math.random() * 10) - 5,
    windSpeed: pattern.windSpeed + Math.floor(Math.random() * 8) - 4,
    condition: pattern.condition
  };
}

// Helper: Find nearest city from coordinates (custom reverse geocoding)
function getNearestCity(latitude, longitude) {
  let nearest = indianLocationsDB[0];
  let minDistance = Infinity;

  indianLocationsDB.forEach(location => {
    // Haversine formula simplified for short distances
    const dLat = latitude - location.lat;
    const dLon = longitude - location.lon;
    const distance = Math.sqrt(dLat * dLat + dLon * dLon);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = location;
    }
  });

  return nearest;
}

// Helper: Get soil data based on location
function getSoilDataByDistrict(state, region) {
  const soilDatabase = {
    "Delhi": { type: "Alluvial Soil", pH: 7.5, nitrogen: "Low", phosphorus: "Medium", potassium: "Medium", texture: "Loam", fertility: "Fair", color: "Brown", organic_matter: "1.8%" },
    "Maharashtra": { type: "Black Soil", pH: 7.1, nitrogen: "Medium", phosphorus: "Low", potassium: "High", texture: "Clay", fertility: "Good", color: "Black", organic_matter: "2.7%" },
    "Karnataka": { type: "Red Soil", pH: 6.2, nitrogen: "Low", phosphorus: "Low", potassium: "Medium", texture: "Loam", fertility: "Fair", color: "Red", organic_matter: "1.4%" },
    "Tamil Nadu": { type: "Laterite Soil", pH: 5.8, nitrogen: "Low", phosphorus: "Low", potassium: "Medium", texture: "Clay", fertility: "Fair", color: "Red", organic_matter: "1.5%" },
    "Telangana": { type: "Black Soil", pH: 7.3, nitrogen: "Medium", phosphorus: "Low", potassium: "High", texture: "Clay", fertility: "Good", color: "Black", organic_matter: "2.5%" },
    "West Bengal": { type: "Alluvial Soil", pH: 7.2, nitrogen: "Medium", phosphorus: "Medium", potassium: "High", texture: "Loam", fertility: "Good", color: "Brown", organic_matter: "2.2%" },
    "Gujarat": { type: "Sandy Loam", pH: 7.6, nitrogen: "Low", phosphorus: "Low", potassium: "Low", texture: "Sandy", fertility: "Fair", color: "Brown", organic_matter: "1.3%" },
    "Madhya Pradesh": { type: "Black Soil", pH: 7.0, nitrogen: "Medium", phosphorus: "Low", potassium: "High", texture: "Clay", fertility: "Good", color: "Black", organic_matter: "2.5%" },
    "Rajasthan": { type: "Sandy Loam", pH: 7.8, nitrogen: "Low", phosphorus: "Medium", potassium: "Low", texture: "Sandy", fertility: "Poor", color: "Red", organic_matter: "1.2%" },
    "Punjab": { type: "Alluvial Soil", pH: 7.4, nitrogen: "High", phosphorus: "Medium", potassium: "High", texture: "Loam", fertility: "Excellent", color: "Brown", organic_matter: "2.9%" },
    "Uttar Pradesh": { type: "Alluvial Soil", pH: 7.3, nitrogen: "Low", phosphorus: "Medium", potassium: "High", texture: "Loam", fertility: "Good", color: "Brown", organic_matter: "2.0%" },
    "Kerala": { type: "Laterite Soil", pH: 5.5, nitrogen: "Low", phosphorus: "Low", potassium: "Medium", texture: "Clay", fertility: "Fair", color: "Red", organic_matter: "2.0%" },
    "Andhra Pradesh": { type: "Red Soil", pH: 6.5, nitrogen: "Low", phosphorus: "Low", potassium: "Medium", texture: "Loam", fertility: "Fair", color: "Red", organic_matter: "1.6%" }
  };

  return soilDatabase[state] || {
    type: "Alluvial Soil",
    pH: 7.0 + Math.random() * 0.8,
    nitrogen: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
    phosphorus: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
    potassium: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
    texture: "Loam",
    fertility: "Good",
    color: "Brown",
    organic_matter: (1.5 + Math.random() * 2).toFixed(1) + "%"
  };
}

// Helper: Generate realistic weather for location
function generateWeatherData(latitude, longitude) {
  const city = getNearestCity(latitude, longitude);
  const month = new Date().getMonth();
  const weather = getWeatherByRegion(city.region, month);

  return {
    temperature: weather.temperature,
    humidity: weather.humidity,
    windSpeed: weather.windSpeed,
    condition: weather.condition,
    feelsLike: weather.temperature + Math.floor(Math.random() * 4) - 2,
    uvIndex: 4 + Math.floor(Math.random() * 5),
    visibility: 8 + Math.floor(Math.random() * 4),
    pressure: 1010 + Math.floor(Math.random() * 6),
    clouds: weather.condition === "Sunny" ? Math.floor(Math.random() * 20) : Math.floor(Math.random() * 60) + 20
  };
}

// Helper: Generate 5-day forecast based on patterns
function generateForecast(latitude, longitude) {
  const city = getNearestCity(latitude, longitude);
  const month = new Date().getMonth();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = new Date().getDay();

  const forecast = [];
  for (let i = 1; i <= 5; i++) {
    const dayIndex = (currentDay + i) % 7;
    const dayName = dayNames[dayIndex];

    // Add rainfall variability based on season and region
    const isMonsonRegion = month >= 6 && month <= 9;
    const rainfall = isMonsonRegion ? Math.floor(Math.random() * 25) + 5 : Math.floor(Math.random() * 15);
    const chance = Math.floor(Math.random() * 70) + (isMonsonRegion ? 20 : 0);

    forecast.push({
      day: dayName,
      rainfall: rainfall + "mm",
      chance: Math.min(chance, 95) + "%"
    });
  }

  return forecast;
}

// Weather GET route - loads page with geolocation or default
app.get("/agriflow/weather", async (req, res) => {
  try {
    // Get coordinates from query params (from frontend geolocation) or use defaults
    const latitude = parseFloat(req.query.lat) || 22.7196; // Indore default
    const longitude = parseFloat(req.query.lon) || 75.8577;

    // Fetch real weather data (with API fallback to local generation)
    const weatherData_raw = await fetchRealWeatherData(latitude, longitude);

    // Use API location if available, otherwise use nearest city from database
    let locationData;
    let region = "Central";

    if (weatherData_raw.apiLocation) {
      console.log(`✅ Using location from API: ${weatherData_raw.apiLocation.city}, ${weatherData_raw.apiLocation.state}`);
      // Find region for this state
      const stateMatch = indianLocationsDB.find(loc => loc.state === weatherData_raw.apiLocation.state);
      region = stateMatch ? stateMatch.region : "Central";

      locationData = {
        city: weatherData_raw.apiLocation.city,
        state: weatherData_raw.apiLocation.state,
        region: region
      };
    } else {
      console.log(`⚠️ API location unavailable, using nearest city from database`);
      locationData = getNearestCity(latitude, longitude);
      region = locationData.region;
    }

    // Get 5-day forecast using local patterns
    const forecastData = generateForecast(latitude, longitude);

    // Get soil data based on state
    const soilData = getSoilDataByDistrict(locationData.state, region);

    // Determine current season based on month
    const month = new Date().getMonth();
    let currentSeason = "Rabi";
    if (month >= 5 && month <= 9) currentSeason = "Kharif";
    else if (month >= 9 && month <= 11) currentSeason = "Hariyana";

    // Compile complete weather data with detailed metrics
    const weatherData = {
      location: {
        city: locationData.city,
        state: locationData.state,
        latitude: latitude,
        longitude: longitude,
        district: locationData.state
      },
      weather: {
        temperature: weatherData_raw.temperature,
        feelsLike: weatherData_raw.feelsLike,
        humidity: weatherData_raw.humidity,
        windSpeed: weatherData_raw.windSpeed || Math.round(weatherData_raw.windSpeedKmh / 3.6),
        windSpeedKmh: weatherData_raw.windSpeedKmh || Math.round((weatherData_raw.windSpeed || 0) * 3.6),
        condition: weatherData_raw.condition,
        description: weatherData_raw.description,
        uvIndex: weatherData_raw.uvIndex,
        visibility: weatherData_raw.visibility,
        pressure: weatherData_raw.pressure,
        clouds: weatherData_raw.clouds,
        rainfall: weatherData_raw.rainfall || 0
      },
      rainfall: {
        today: weatherData_raw.rainfall || (weatherData_raw.humidity > 70 ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * 3)),
        thisWeek: 12.5,
        thisMonth: 45.6,
        lastMonth: 120.5,
        forecast: forecastData
      },
      soil: {
        type: soilData.type,
        pH: soilData.pH,
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.phosphorus,
        potassium: soilData.potassium,
        organic_matter: soilData.organic_matter,
        color: soilData.color,
        texture: soilData.texture,
        fertility: soilData.fertility,
        recommendations: [
          `${soilData.type === "Black Soil" ? "काली मिट्टी के लिए जल निकास का विशेष ध्यान रखें / Ensure proper drainage for black soil" : "मिट्टी की नमी बनाए रखें / Maintain soil moisture"}`,
          `pH स्तर (${soilData.pH}) अनुसार खाद का चयन करें / Adjust fertilizers per pH level (${soilData.pH})`,
          `${soilData.nitrogen === "Low" ? "नाइट्रोजन युक्त खाद बढ़ाएँ / Increase nitrogen-rich fertilizers" : "नाइट्रोजन संतुलित रखें / Maintain nitrogen balance"}`,
          `जैविक खाद का नियमित उपयोग करें / Use organic fertilizers regularly`
        ]
      },
      airQuality: {
        index: 80 + Math.floor(Math.random() * 60),
        level: weatherData_raw.humidity > 75 ? "Poor" : "Moderate",
        pm25: 30 + Math.floor(Math.random() * 40),
        pm10: 60 + Math.floor(Math.random() * 60),
        no2: 20 + Math.floor(Math.random() * 40),
        so2: 5 + Math.floor(Math.random() * 15)
      },
      season: {
        current: currentSeason,
        bestCrops: currentSeason === "Kharif" ? ["धान (Rice)", "सोयाबीन (Soybean)", "मक्का (Maize)"] : ["गेहूं (Wheat)", "जौ (Barley)", "सरसों (Mustard)"],
        waterNeeds: currentSeason === "Kharif" ? "High" : "Medium"
      },
      lastUpdate: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    };

    res.render("agriflow-weather", { weatherData });
  } catch (error) {
    console.error("Weather page error:", error);
    res.status(500).send("Error loading weather data");
  }
});

// Weather API endpoint (for AJAX calls with geolocation)
app.get("/api/weather", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    // Fetch real weather data (with fallback)
    const weatherData_raw = await fetchRealWeatherData(lat, lon);

    // Use API location if available, otherwise use nearest city from database
    let locationData;
    let region = "Central";

    if (weatherData_raw.apiLocation) {
      console.log(`✅ API Response - City: ${weatherData_raw.apiLocation.city}, State: ${weatherData_raw.apiLocation.state}`);
      const stateMatch = indianLocationsDB.find(loc => loc.state === weatherData_raw.apiLocation.state);
      region = stateMatch ? stateMatch.region : "Central";

      locationData = {
        city: weatherData_raw.apiLocation.city,
        state: weatherData_raw.apiLocation.state,
        region: region
      };
    } else {
      locationData = getNearestCity(lat, lon);
      region = locationData.region;
    }

    // Get soil data
    const soilData = getSoilDataByDistrict(locationData.state, region);

    // Detailed weather metrics for display
    const weatherResponse = {
      status: "success",
      location: {
        city: locationData.city,
        state: locationData.state,
        latitude: lat,
        longitude: lon,
        district: locationData.state
      },
      weather: {
        temperature: weatherData_raw.temperature,
        feelsLike: weatherData_raw.feelsLike,
        humidity: weatherData_raw.humidity,
        windSpeed: weatherData_raw.windSpeed,
        windSpeedKmh: weatherData_raw.windSpeedKmh,
        condition: weatherData_raw.condition,
        description: weatherData_raw.description,
        uvIndex: weatherData_raw.uvIndex,
        visibility: weatherData_raw.visibility,
        pressure: weatherData_raw.pressure,
        clouds: weatherData_raw.clouds,
        rainfall: weatherData_raw.rainfall
      },
      detailedMetrics: {
        "🌧️ Rainfall": weatherData_raw.rainfall + " mm",
        "💧 Humidity": weatherData_raw.humidity + " %",
        "🌬️ Wind Speed": (weatherData_raw.windSpeed || Math.round(weatherData_raw.windSpeedKmh / 3.6)) + " m/s",
        "🌡️ Feels Like Temp": weatherData_raw.feelsLike + "°C",
        "🔵 Pressure": weatherData_raw.pressure + " hPa",
        "☁️ Cloud Cover": weatherData_raw.clouds + " %"
      },
      soil: {
        type: soilData.type,
        pH: soilData.pH,
        fertility: soilData.fertility
      },
      timestamp: new Date().toISOString(),
      dataSource: weatherData_raw.apiLocation ? "Real API" : "Local Fallback"
    };

    res.json(weatherResponse);
  } catch (error) {
    console.error("Weather API error:", error);
    res.status(500).json({ error: "Server error", message: error.message });
  }
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

// ==================== EMI Planning (model3.py via emi_runner.py) ====================

app.get("/emi-plan", (req, res) => {
  res.render("agriflow-emi-plan");
});

app.get("/agriflow/emi-plan", (req, res) => {
  res.render("agriflow-emi-plan");
});

app.post("/api/emi-plan", async (req, res) => {
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

    const report = await callEMIPlannerAPI({
      farmer_name: name,
      farmer_district: district,
      farmer_state: state,
      farmer_crop: crop,
      farmer_irrigation: irrigation,
      loan_amount: parseFloat(loanAmount),
      duration_months: parseInt(duration, 10)
    });

    res.json(report);
  } catch (error) {
    console.error("EMI Plan API error:", error);
    res.status(500).json({
      error: "Failed to generate EMI plan",
      details: error.message
    });
  }
});

app.get("/emi-plan-result", (req, res) => {
  res.render("agriflow-emi-result");
});

app.get("/agriflow/emi-plan-result", (req, res) => {
  res.render("agriflow-emi-result");
});

function parsePythonJsonOutput(output) {
  const trimmed = output.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end < start) {
    throw new Error("No JSON object in Python output");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function getPythonCommandAndArgs(runnerPath, inputPath) {
  if (process.env.PYTHON) {
    return { cmd: process.env.PYTHON, args: [runnerPath, inputPath] };
  }
  if (process.platform === "win32") {
    return { cmd: "python", args: [runnerPath, inputPath] };
  }
  return { cmd: "python3", args: [runnerPath, inputPath] };
}

async function callEMIPlannerAPI(farmerData) {
  return new Promise((resolve, reject) => {
    const runnerPath = path.join(__dirname, "emi_runner.py");
    const inputPath = path.join(__dirname, `.tmp_emi_input_${Date.now()}.json`);

    try {
      fs.writeFileSync(inputPath, JSON.stringify(farmerData), "utf8");
    } catch (err) {
      reject(err);
      return;
    }

    const { cmd, args } = getPythonCommandAndArgs(runnerPath, inputPath);
    const child = spawn(cmd, args, {
      cwd: __dirname,
      env: { ...process.env, PYTHONUTF8: "1" }
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("error", (err) => {
      fs.unlink(inputPath, () => {});
      reject(new Error(`Failed to start Python (${cmd}): ${err.message}`));
    });

    child.on("close", (code) => {
      fs.unlink(inputPath, () => {});

      let parsed;
      try {
        parsed = parsePythonJsonOutput(output);
      } catch (e) {
        if (code === 0) {
          console.error("EMI Python stdout parse error:", e.message, output);
          resolve(createFallbackEMIPlan(farmerData));
        } else {
          reject(
            new Error(
              errorOutput.trim() ||
                output.trim() ||
                `Python EMI planner exited with code ${code}`
            )
          );
        }
        return;
      }

      if (parsed.status === "error") {
        resolve(parsed);
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            parsed.error ||
              errorOutput.trim() ||
              `Python EMI planner exited with code ${code}`
          )
        );
        return;
      }

      resolve(parsed);
    });
  });
}

function createFallbackEMIPlan(farmerData) {
  const numMonths = farmerData.duration_months;
  const loanAmount = farmerData.loan_amount;
  const baseIncome = 15000 + Math.random() * 10000;

  const monthlySchedule = [];
  for (let i = 1; i <= numMonths; i++) {
    const variance = 0.8 + Math.random() * 0.4;
    const income = Math.floor(baseIncome * variance);
    const seasonalAdjustment = i % 3 === 0 ? 1.5 : 1.0;
    const adjustedIncome = Math.floor(income * seasonalAdjustment);
    const emi = Math.floor(loanAmount / numMonths);
    const ratio = ((emi / adjustedIncome) * 100).toFixed(2);

    monthlySchedule.push({
      month: i,
      predicted_income: adjustedIncome,
      optimized_emi: emi,
      emi_to_income_ratio: parseFloat(ratio),
      remaining_income: adjustedIncome - emi,
      risk_score: 20 + Math.random() * 40
    });
  }

  const avgIncome =
    monthlySchedule.reduce((sum, m) => sum + m.predicted_income, 0) / numMonths;
  const avgEMI =
    monthlySchedule.reduce((sum, m) => sum + m.optimized_emi, 0) / numMonths;

  return {
    status: "success",
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
      max_income: Math.max(...monthlySchedule.map((m) => m.predicted_income)),
      min_income: Math.min(...monthlySchedule.map((m) => m.predicted_income)),
      income_std: 2500
    },
    emi_schedule: {
      status: "Optimal",
      avg_emi: Math.floor(avgEMI),
      total_emi: loanAmount,
      monthly_schedule: monthlySchedule
    },
    risk_analysis: {
      avg_risk_score: 45,
      max_risk_score: 75,
      risk_level: "Medium"
    },
    affordability: {
      avg_emi_to_income_ratio:
        Math.round((avgEMI / avgIncome) * 10000) / 100,
      affordability_level: "Affordable",
      recommendation: "Recommended"
    },
    recommendations: [
      {
        type: "success",
        message: "EMI plan is feasible with current projections"
      },
      {
        type: "info",
        message: "Consider crop diversification for income stability"
      }
    ]
  };
}

async function callMonthlyIncomeRunner(payload) {
  return new Promise((resolve) => {
    const runnerPath = path.join(__dirname, "monthly_income_runner.py");
    const inputPath = path.join(__dirname, `.tmp_income_input_${Date.now()}.json`);
    try {
      fs.writeFileSync(inputPath, JSON.stringify(payload), "utf8");
    } catch {
      resolve(null);
      return;
    }
    const { cmd, args } = getPythonCommandAndArgs(runnerPath, inputPath);
    const child = spawn(cmd, args, {
      cwd: __dirname,
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" }
    });
    let output = "";
    let err = "";
    child.stdout.on("data", (d) => {
      output += d.toString("utf8");
    });
    child.stderr.on("data", (d) => {
      err += d.toString("utf8");
    });
    child.on("error", () => {
      fs.unlink(inputPath, () => {});
      resolve(null);
    });
    child.on("close", () => {
      fs.unlink(inputPath, () => {});
      try {
        const parsed = parsePythonJsonOutput(output);
        if (parsed.status === "success" && Array.isArray(parsed.monthlyData)) {
          resolve(parsed);
          return;
        }
      } catch {
        /* ignore */
      }
      if (err.trim()) {
        console.error("monthly_income_runner stderr:", err.slice(0, 500));
      }
      resolve(null);
    });
  });
}

// ==================== Helper Functions ====================

async function generateMonthlyIncome(crop, land, fertilizer, pesticide, district) {
  const fromPy = await callMonthlyIncomeRunner({
    crop,
    land,
    fertilizer,
    pesticide,
    district
  });
  if (fromPy) {
    return {
      monthlyData: fromPy.monthlyData,
      rainfall: fromPy.rainfall,
      ndvi: fromPy.ndvi,
      mandiPrice: fromPy.mandiPrice,
      priceShock: fromPy.priceShock
    };
  }

  const months = [
    "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"
  ];

  // Seasonal shape for rainfall (mm) — aligns with monsoon months in training data
  const RAINFALL_SHAPE = [0.45, 0.4, 0.35, 0.45, 0.85, 1.35, 1.65, 1.5, 1.1, 0.75, 0.55, 0.5];
  const NDVI_SHAPE = [0.95, 0.93, 0.91, 0.96, 1.02, 1.1, 1.12, 1.1, 1.04, 0.98, 0.96, 0.95];
  const avgRainShape = RAINFALL_SHAPE.reduce((a, b) => a + b, 0) / 12;

  const baseRainfallRaw = await fetchRainfallData(district);
  // OpenWeather 1h rain is not monthly mm; use training-scale anchor (~80 mm / month mean)
  const baseRainfall = Math.max(40, Math.min(140, (baseRainfallRaw || 0) * 15 + 55));
  const baseNdvi = getNDVIValue(crop, fertilizer, pesticide);
  const baseMandi = getMandiPrice(crop);

  const monthlyPrices = [Math.max(100, Math.floor(baseMandi))];
  for (let i = 1; i < 12; i++) {
    const drift = 1 + (Math.random() * 0.06 - 0.03);
    monthlyPrices.push(Math.max(100, Math.floor(monthlyPrices[i - 1] * drift)));
  }

  let lag1;
  let lag2;
  ({ lag1, lag2 } = getNetIncomeLags(crop, land, baseMandi));

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
  const ndviAdjustment = 0.8 + baseNdvi * 0.25;
  const rainfallAdjustment = 1.0 + Math.min(baseRainfall, 50) / 500;

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
      let inc =
        ((baseMandi * land * revenueMultiplier) / 12) *
        seasonalPattern[i] *
        ndviAdjustment *
        (1 + priceShockPct) *
        rainfallAdjustment;
      inc *= 0.95 + Math.random() * 0.1;
      monthlyIncome = Math.max(500, Math.floor(inc));
    }

    monthlyData.push({ month: months[i], income: monthlyIncome });
  }

  const avgShockPct =
    monthlyShocks.length === 0
      ? 0
      : monthlyShocks.reduce((a, b) => a + b, 0) / monthlyShocks.length;

  return {
    monthlyData,
    rainfall: baseRainfall,
    ndvi: baseNdvi,
    mandiPrice: baseMandi,
    priceShock: parseFloat((avgShockPct * 100).toFixed(2))
  };
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
  ndvi = Math.min(0.85, Math.max(0, ndvi));
  return parseFloat(ndvi.toFixed(3));
}

function getMandiPrice(crop) {
  const mandiPrices = {
    "धान": 2100,
    "गेहूं": 2200,
    "कपास": 5800,
    "गन्ना": 3200,
    "सोयाबीन": 4500,
    "मक्का": 1800,
    "अन्य": 2500
  };

  const basePrice = mandiPrices[crop] || mandiPrices["अन्य"];
  const variation = 0.95 + Math.random() * 0.1;
  return Math.floor(basePrice * variation);
}

function getNetIncomeLags(crop, land, mandiPrice) {
  // model1 training: net_income_lag1/2 are prior *months'* net income (~₹5k–₹50k typical)
  const k = crop === "धान" || crop === "गेहूं" ? 25 : 20;
  const estimatedMonthly = Math.floor((mandiPrice * land * k) / 12);
  const base = Math.max(5000, estimatedMonthly);
  return {
    lag1: Math.floor(base * 0.95),
    lag2: Math.floor(base * 0.9)
  };
}

async function predictIncomeWithML(features) {
  try {
    const baseUrl = process.env.FLASK_ML_URL || "http://127.0.0.1:5000";
    const response = await fetch(`${baseUrl}/predict-income`, {
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

// ==================== WEATHER ALERTS API ====================

// Get smart weather alerts based on current conditions
app.get("/api/weather-alerts", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    // Fetch real weather data
    const weatherData_raw = await fetchRealWeatherData(lat, lon);

    if (!weatherData_raw) {
      return res.status(500).json({ error: "Failed to fetch weather data" });
    }

    // Get location data
    let locationData;
    if (weatherData_raw.apiLocation) {
      locationData = {
        city: weatherData_raw.apiLocation.city,
        state: weatherData_raw.apiLocation.state
      };
    } else {
      const nearest = getNearestCity(lat, lon);
      locationData = {
        city: nearest.city,
        state: nearest.state
      };
    }

    // Generate weather alerts using WeatherAlertService
    const alerts = WeatherAlertService.generateWeatherAlerts(weatherData_raw, locationData);
    const actionPriority = WeatherAlertService.getActionPriority(alerts);
    const cropRecommendation = WeatherAlertService.getCropRecommendations(weatherData_raw);

    return res.json({
      status: "success",
      location: locationData,
      weather: {
        temperature: weatherData_raw.temperature,
        humidity: weatherData_raw.humidity,
        windSpeed: weatherData_raw.windSpeed,
        condition: weatherData_raw.condition,
        rainfall: weatherData_raw.rainfall || 0
      },
      alerts: alerts,
      totalAlerts: alerts.length,
      actionPriority: actionPriority,
      cropRecommendation: cropRecommendation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating weather alerts:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== DYNAMIC WEATHER ALERTS API ====================

// Store alerts in memory for the session
let weatherAlertsCache = [];

// Helper: Format time as "X min ago"
function getTimeAgo(minutes = 0) {
  if (minutes === 0) return "Just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

// Dynamic weather alerts endpoint
app.get("/api/alerts", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Valid latitude and longitude required" });
    }

    // Fetch real weather data
    const weatherData = await fetchRealWeatherData(lat, lon);
    if (!weatherData) {
      return res.status(500).json({ error: "Could not fetch weather data" });
    }

    // Generate alerts based on weather
    const alerts = [];

    // 🌧️ Rain Alert
    if (weatherData.condition && weatherData.condition.toLowerCase().includes('rain')) {
      alerts.push({
        message: "🌧️ बारिश होने वाली है, सिंचाई रोकें / Rain expected, stop irrigation",
        type: "weather",
        severity: "medium",
        time: getTimeAgo(0)
      });
    }

    // 💧 High Humidity Alert (>80%)
    if (weatherData.humidity > 80) {
      alerts.push({
        message: `⚠️ अधिक नमी (${weatherData.humidity}%), फसल में रोग का खतरा / High humidity risk of crop disease`,
        type: "warning",
        severity: "high",
        time: getTimeAgo(0)
      });
    }

    // 🔥 High Temperature Alert (>35°C)
    if (weatherData.temperature > 35) {
      alerts.push({
        message: `🔥 अत्यधिक तापमान (${weatherData.temperature}°C), फसल को पानी दें / High temperature, water crops immediately`,
        type: "warning",
        severity: "high",
        time: getTimeAgo(0)
      });
    }

    // 🌬️ Strong Wind Alert (>10 m/s)
    if (weatherData.windSpeed && weatherData.windSpeed > 10) {
      alerts.push({
        message: `🌬️ तेज हवा (${weatherData.windSpeed} m/s), फसल को नुकसान हो सकता है / Strong wind, crops may be damaged`,
        type: "warning",
        severity: "medium",
        time: getTimeAgo(0)
      });
    }

    // ❄️ Frost Alert (<5°C)
    if (weatherData.temperature < 5) {
      alerts.push({
        message: `❄️ कड़ी ठंड (${weatherData.temperature}°C), पाले का खतरा / Frost risk, cover crops`,
        type: "warning",
        severity: "high",
        time: getTimeAgo(0)
      });
    }

    // 🏜️ Low Humidity Alert (<20%)
    if (weatherData.humidity < 20) {
      alerts.push({
        message: `🏜️ बहुत कम नमी (${weatherData.humidity}%), सिंचाई बढ़ाएं / Very low humidity, increase irrigation`,
        type: "warning",
        severity: "medium",
        time: getTimeAgo(0)
      });
    }

    // ✅ Normal Conditions Alert
    if (alerts.length === 0 ||
      (weatherData.temperature >= 15 && weatherData.temperature <= 35 &&
        weatherData.humidity >= 40 && weatherData.humidity <= 80 &&
        weatherData.windSpeed <= 10 &&
        !weatherData.condition?.toLowerCase().includes('rain'))) {
      alerts.push({
        message: "✅ सामान्य मौसम / Normal conditions - Good day for farming",
        type: "normal",
        severity: "low",
        time: getTimeAgo(0)
      });
    }

    // Cache alerts for this session
    weatherAlertsCache = alerts;

    res.json({
      status: "success",
      alerts: alerts,
      total: alerts.length,
      location: weatherData.apiLocation || { city: "Your Location", state: "" },
      weather: {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        condition: weatherData.condition,
        rainfall: weatherData.rainfall
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Alerts API error:", error);
    res.status(500).json({ error: "Server error", message: error.message });
  }
});

// ==================== NOTIFICATION API ENDPOINTS ====================

// Notifications center page
app.get("/agriflow/notifications", (req, res) => {
  res.render("notifications");
});

// Get unread notifications
app.get("/api/notifications/unread", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const alerts = await SmartAlertEngine.getUnreadAlerts(req.session.userId);
    return res.json({
      status: "success",
      count: alerts.length,
      alerts: alerts
    });
  } catch (error) {
    console.error("Error getting unread notifications:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Get all notifications with pagination
app.get("/api/notifications", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await SmartAlertEngine.getAllAlerts(req.session.userId, page, limit);
    return res.json({
      status: "success",
      ...result
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
app.post("/api/notifications/:id/read", async (req, res) => {
  try {
    const alert = await SmartAlertEngine.markAsRead(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    return res.json({ status: "success", alert });
  } catch (error) {
    console.error("Error marking alert as read:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Dismiss notification
app.post("/api/notifications/:id/dismiss", async (req, res) => {
  try {
    const alert = await SmartAlertEngine.dismissAlert(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    return res.json({ status: "success", alert });
  } catch (error) {
    console.error("Error dismissing alert:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Test: Generate and save sample alerts
app.post("/api/notifications/generate-sample", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Sample weather data
    const weatherData = {
      temperature: 42,
      rainfall: 55,
      humidity: 15
    };

    const location = {
      city: "Gwalior",
      state: "Madhya Pradesh",
      latitude: 26.2389,
      longitude: 78.1639
    };

    // Generate alerts
    const weatherAlerts = await SmartAlertEngine.generateWeatherAlert(req.session.userId, weatherData, location);
    const incomeAlerts = await SmartAlertEngine.generateIncomeAlert(req.session.userId, 45000, 50000);
    const seasonalAlerts = SmartAlertEngine.generateSeasonalAlert(req.session.userId, location, 'summer');

    // Combine all alerts
    const allAlerts = [...weatherAlerts, ...incomeAlerts, ...seasonalAlerts];

    // Save to database
    const savedAlerts = await SmartAlertEngine.saveAlerts(req.session.userId, allAlerts);

    return res.json({
      status: "success",
      message: `Generated and saved ${savedAlerts.length} sample alerts`,
      alerts: savedAlerts
    });
  } catch (error) {
    console.error("Error generating sample alerts:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.use("/", authRoutes);

app.listen(3000, () => {
  console.log("🌾 AgriFlow Server running on http://localhost:3000");
});