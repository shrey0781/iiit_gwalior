/**
 * WeatherAlertService - Smart Weather Analysis for Farmers
 * Converts weather data into actionable farmer-friendly alerts
 */

class WeatherAlertService {
    /**
     * Analyze weather and generate alerts
     */
    static generateWeatherAlerts(weatherData, location) {
        const alerts = [];

        if (!weatherData) return alerts;

        // 🌧️ RAIN ALERT
        if (weatherData.condition && weatherData.condition.toLowerCase().includes('rain')) {
            alerts.push({
                id: 'rain',
                type: 'rain',
                severity: 'warning',
                emoji: '🌧️',
                title: 'बारिश होने वाली है / Rain Expected',
                message: 'बारिश आने वाली है। सिंचाई न करें। Wait for rain, avoid irrigation.',
                recommendation: 'Postpone irrigation and field work. Check drainage systems.',
                color: '#2196f3',
                backgroundColor: '#e3f2fd',
                borderColor: '#1976d2'
            });
        }

        // 💧 HIGH HUMIDITY ALERT (> 80%)
        if (weatherData.humidity > 80) {
            alerts.push({
                id: 'humidity',
                type: 'disease',
                severity: 'warning',
                emoji: '⚠️',
                title: 'उच्च नमी / High Humidity',
                message: `नमी ${weatherData.humidity}% है। फसल में बीमारी का खतरा। Humidity is ${weatherData.humidity}% - High risk of crop disease.`,
                recommendation: 'Improve field ventilation. Consider fungicide application. Increase spacing between plants.',
                color: '#ff9800',
                backgroundColor: '#fff3e0',
                borderColor: '#f57c00'
            });
        }

        // 🔥 HIGH TEMPERATURE ALERT (> 35°C)
        if (weatherData.temperature > 35) {
            alerts.push({
                id: 'temperature',
                type: 'heat',
                severity: 'danger',
                emoji: '🔥',
                title: 'अत्यधिक गर्मी / High Temperature',
                message: `तापमान ${weatherData.temperature}°C है। फसल को पानी दें। Temperature is ${weatherData.temperature}°C - Water crops immediately.`,
                recommendation: 'Increase irrigation frequency. Apply mulch to retain soil moisture. Water crops early morning or evening.',
                color: '#d32f2f',
                backgroundColor: '#ffebee',
                borderColor: '#c62828'
            });
        }

        // 🌬️ STRONG WIND ALERT (> 10 m/s)
        if (weatherData.windSpeed && weatherData.windSpeed > 10) {
            alerts.push({
                id: 'wind',
                type: 'wind',
                severity: 'warning',
                emoji: '🌬️',
                title: 'तेज हवा / Strong Winds',
                message: `हवा की गति ${weatherData.windSpeed} मीटर/सेकंड है। फसल की सुरक्षा करें। Wind speed ${weatherData.windSpeed} m/s - Protect crops.`,
                recommendation: 'Tie support structures. Cover delicate crops. Prune overgrown branches to reduce wind damage.',
                color: '#7b1fa2',
                backgroundColor: '#f3e5f5',
                borderColor: '#6a1b9a'
            });
        }

        // ❄️ LOW TEMPERATURE ALERT (< 5°C)
        if (weatherData.temperature < 5) {
            alerts.push({
                id: 'cold',
                type: 'frost',
                severity: 'warning',
                emoji: '❄️',
                title: 'कड़ी ठंड / Frost Risk',
                message: `तापमान ${weatherData.temperature}°C है। पाले का खतरा। Temperature ${weatherData.temperature}°C - Risk of frost damage.`,
                recommendation: 'Cover sensitive crops with plastic sheets. Increase irrigation before frost. Prune dead leaves.',
                color: '#00838f',
                backgroundColor: '#e0f2f1',
                borderColor: '#00695c'
            });
        }

        // ☀️ CLEAR WEATHER ALERT
        if (weatherData.condition &&
            (weatherData.condition.toLowerCase().includes('clear') ||
                weatherData.condition.toLowerCase().includes('sunny')) &&
            weatherData.temperature > 15 &&
            weatherData.temperature <= 35 &&
            weatherData.humidity < 80 &&
            (!weatherData.windSpeed || weatherData.windSpeed <= 10)) {
            alerts.push({
                id: 'normal',
                type: 'normal',
                severity: 'normal',
                emoji: '✅',
                title: 'सामान्य मौसम / Normal Conditions',
                message: 'मौसम की स्थिति सामान्य है। खेत का काम करने के लिए अच्छा दिन है। Weather conditions are ideal for farming activities.',
                recommendation: 'Good day for field work, spraying, and irrigation. Plan outdoor activities.',
                color: '#388e3c',
                backgroundColor: '#e8f5e9',
                borderColor: '#2e7d32'
            });
        }

        // 💨 LOW HUMIDITY ALERT (< 20%)
        if (weatherData.humidity < 20) {
            alerts.push({
                id: 'low-humidity',
                type: 'drought',
                severity: 'warning',
                emoji: '🏜️',
                title: 'बहुत कम नमी / Very Low Humidity',
                message: `नमी केवल ${weatherData.humidity}% है। सूखे का खतरा। Humidity is only ${weatherData.humidity}% - Drought risk.`,
                recommendation: 'Increase irrigation frequency. Apply mulch. Use drip irrigation if possible. Reduce plant spacing.',
                color: '#e65100',
                backgroundColor: '#ffe0b2',
                borderColor: '#bf360c'
            });
        }

        return alerts;
    }

    /**
     * Get alert description in Hindi and English
     */
    static getAlertDescription(alertType) {
        const descriptions = {
            rain: {
                hi: 'बारिश से खेत में जलभराव हो सकता है और कीटों का प्रकोप बढ़ सकता है।',
                en: 'Rain can cause waterlogging and increase pest attacks. Avoid unnecessary field operations.'
            },
            disease: {
                hi: 'अधिक नमी से फंगल रोगों (पत्ती धब्बा, चूर्णी फफूंद) का खतरा बढ़ता है।',
                en: 'High humidity promotes fungal diseases like leaf spot and powdery mildew. Ensure proper ventilation.'
            },
            heat: {
                hi: 'तापमान अधिक होने पर फसल को अतिरिक्त पानी की जरूरत होती है।',
                en: 'High temperatures increase crop water requirement. Provide supplementary irrigation.'
            },
            wind: {
                hi: 'तेज हवा से फसल गिर सकती है और पत्तियों को नुकसान हो सकता है।',
                en: 'Strong winds can cause crop lodging and leaf damage. Provide support to weak plants.'
            },
            frost: {
                hi: 'ठंड से गैर-सहिष्णु पौधे मर सकते हैं। सुरक्षा के उपाय करें।',
                en: 'Frost can kill sensitive crops. Apply frost protection measures immediately.'
            },
            drought: {
                hi: 'कम नमी से मिट्टी सूख जाती है और पौधों की वृद्धि रुक जाती है।',
                en: 'Low humidity causes soil drying and slows plant growth. Increase watering frequency.'
            }
        };

        return descriptions[alertType] || { hi: '', en: '' };
    }

    /**
     * Get alert severity score for priority
     */
    static getAlertSeverityScore(alerts) {
        let score = 0;
        alerts.forEach(alert => {
            if (alert.severity === 'danger') score += 10;
            else if (alert.severity === 'warning') score += 5;
            else if (alert.severity === 'normal') score += 1;
        });
        return score;
    }

    /**
     * Get crop-specific recommendations based on weather
     */
    static getCropRecommendations(weatherData, cropType = 'general') {
        const recommendations = {
            rice: {
                high_temp: 'धान 30-35°C पर सबसे अच्छे से बढ़ता है। अधिक तापमान में सिंचाई बढ़ाएं।',
                rain: 'धान को पानी की बहुत जरूरत है। सिंचाई में कमी न करें।',
                humidity: 'धान में शीथ ब्लास्ट का खतरा बढ़ता है। ट्राइकोडर्मा का छिड़काव करें।'
            },
            wheat: {
                high_temp: 'गेहूं गर्मी से संवेदनशील है। सिंचाई समय पर करें।',
                rain: 'गेहूं की बाली को नुकसान हो सकता है। कट्टाई जल्दी करें।',
                cold: 'गेहूं सर्दी में अच्छे से बढ़ता है। ठंड चिंता की बात नहीं है।'
            },
            cotton: {
                high_temp: 'कपास 25-30°C में सबसे अच्छे से बढ़ता है। अतिरिक्त पानी दें।',
                rain: 'कपास का गूंद खराब हो सकता है। समय पर कीटनाशक का छिड़काव करें।',
                wind: 'तेज हवा से कपास गिर सकती है। सहायक संरचना बनाएं।'
            },
            sugarcane: {
                high_temp: 'गन्ने को गर्मी पसंद है। नियमित सिंचाई जारी रखें।',
                rain: 'गन्ने में खरपतवार की समस्या बढ़ सकती है। निराई करें।',
                humidity: 'गन्ने में लाल सड़न का खतरा बढ़ता है।'
            }
        };

        const cropRecs = recommendations[cropType?.toLowerCase()] || recommendations.rice;

        // Determine which recommendation applies
        if (weatherData.temperature > 35) return cropRecs.high_temp;
        if (weatherData.condition && weatherData.condition.toLowerCase().includes('rain')) return cropRecs.rain;
        if (weatherData.humidity > 80) return cropRecs.humidity;
        if (weatherData.windSpeed > 10) return cropRecs.wind;
        if (weatherData.temperature < 5) return cropRecs.cold;

        return 'फसल को सामान्य देखभाल दें। Monitor for pests and diseases.';
    }

    /**
     * Get action priority (what to do first)
     */
    static getActionPriority(alerts) {
        const dangerous = alerts.filter(a => a.severity === 'danger');
        const warnings = alerts.filter(a => a.severity === 'warning');

        if (dangerous.length > 0) {
            return {
                priority: 'URGENT',
                action: dangerous[0],
                message: '🚨 तुरंत कार्रवाई करें / Take immediate action'
            };
        }

        if (warnings.length > 0) {
            return {
                priority: 'HIGH',
                action: warnings[0],
                message: '⚠️ जल्दी कार्रवाई करें / Address soon'
            };
        }

        return {
            priority: 'LOW',
            action: null,
            message: '✅ अभी कोई समस्या नहीं / All clear'
        };
    }
}

module.exports = WeatherAlertService;
