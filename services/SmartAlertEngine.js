const Notification = require("../models/Notification");

/**
 * SmartAlertEngine: Generates contextual alerts based on user data and conditions
 */
class SmartAlertEngine {
    /**
     * Generate weather alerts
     */
    static async generateWeatherAlert(userId, weatherData, location) {
        const alerts = [];

        // Heavy rainfall alert
        if (weatherData.rainfall && weatherData.rainfall > 50) {
            alerts.push({
                type: 'WEATHER',
                priority: 'HIGH',
                title: '⚠️ भारी वर्षा की चेतावनी',
                message: `${location.city} में ${weatherData.rainfall}mm भारी वर्षा की संभावना है। अपनी फसल की सुरक्षा करें।`,
                data: {
                    category: 'Weather Hazard',
                    actionRequired: true,
                    actionUrl: '/agriflow/weather',
                    actionLabel: 'View Weather Details',
                    value: weatherData.rainfall,
                    threshold: 50,
                    severity: 'high'
                },
                location: location,
                tags: ['weather', 'rainfall', 'hazard']
            });
        }

        // Extreme heat alert
        if (weatherData.temperature > 40) {
            alerts.push({
                type: 'WEATHER',
                priority: 'HIGH',
                title: '🔥 अत्यधिक गर्मी की चेतावनी',
                message: `${location.city} में तापमान ${weatherData.temperature}°C तक पहुंचेगा। पानी की उपलब्धता सुनिश्चित करें।`,
                data: {
                    category: 'Extreme Temperature',
                    actionRequired: true,
                    value: weatherData.temperature,
                    threshold: 40,
                    severity: 'high'
                },
                location: location,
                tags: ['weather', 'temperature', 'hazard']
            });
        }

        // Low humidity alert
        if (weatherData.humidity < 20) {
            alerts.push({
                type: 'WEATHER',
                priority: 'MEDIUM',
                title: '💧 कम नमी की चेतावनी',
                message: `${location.city} में नमी ${weatherData.humidity}% है। सिंचाई बढ़ाएं।`,
                data: {
                    category: 'Drought Risk',
                    value: weatherData.humidity,
                    threshold: 20,
                    severity: 'medium'
                },
                location: location,
                tags: ['weather', 'humidity', 'drought']
            });
        }

        return alerts;
    }

    /**
     * Generate loan/EMI alerts
     */
    static async generateLoanAlert(userId, loanData) {
        const alerts = [];

        if (!loanData) return alerts;

        const today = new Date();
        const dueDate = new Date(loanData.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        // Payment due soon
        if (daysUntilDue > 0 && daysUntilDue <= 7) {
            alerts.push({
                type: 'PAYMENT_DUE',
                priority: daysUntilDue <= 3 ? 'HIGH' : 'MEDIUM',
                title: '📅 EMI की किस्त की तारीख करीब है',
                message: `आपकी ₹${loanData.amount} की EMI किस्त ${daysUntilDue} दिन में देय है।`,
                description: `Due Date: ${dueDate.toLocaleDateString('hi-IN')}`,
                data: {
                    category: 'Loan Payment',
                    actionRequired: true,
                    actionUrl: `/agriflow`,
                    actionLabel: 'View Loan Details',
                    value: loanData.amount,
                    daysRemaining: daysUntilDue
                },
                tags: ['loan', 'payment', 'emi'],
                expiresAt: dueDate
            });
        }

        // Payment overdue
        if (daysUntilDue < 0) {
            alerts.push({
                type: 'LOAN',
                priority: 'CRITICAL',
                title: '🚨 EMI किस्त अतिदेय है',
                message: `आपकी ₹${loanData.amount} की किस्त ${Math.abs(daysUntilDue)} दिन अतिदेय है।`,
                data: {
                    category: 'Overdue Payment',
                    actionRequired: true,
                    actionUrl: `/agriflow`,
                    actionLabel: 'Pay Now',
                    severity: 'critical'
                },
                tags: ['loan', 'overdue', 'urgent']
            });
        }

        return alerts;
    }

    /**
     * Generate income alerts based on predictions
     */
    static async generateIncomeAlert(userId, incomeData, historicalIncome) {
        const alerts = [];

        if (!incomeData || !historicalIncome) return alerts;

        const percentageChange = ((incomeData - historicalIncome) / historicalIncome) * 100;

        // Income below expected
        if (percentageChange < -20) {
            alerts.push({
                type: 'INCOME',
                priority: 'HIGH',
                title: '📉 आय में महत्वपूर्ण गिरावट की चेतावनी',
                message: `आपकी अपेक्षित आय ${Math.abs(percentageChange).toFixed(1)}% कम है। अपनी फसल की योजना दोबारा देखें।`,
                data: {
                    category: 'Income Risk',
                    actionRequired: true,
                    actionUrl: '/agriflow/income',
                    actionLabel: 'View Income Analysis',
                    value: incomeData,
                    expected: historicalIncome,
                    changePercent: percentageChange
                },
                tags: ['income', 'risk', 'planning']
            });
        }

        // Income above expected
        if (percentageChange > 25) {
            alerts.push({
                type: 'INCOME',
                priority: 'LOW',
                title: '📈 आय में सुधार की संभावना',
                message: `आपकी अपेक्षित आय ${percentageChange.toFixed(1)}% अधिक है। बेहतरीन प्रदर्शन!`,
                data: {
                    category: 'Income Growth',
                    value: incomeData,
                    expected: historicalIncome,
                    changePercent: percentageChange
                },
                tags: ['income', 'positive', 'growth']
            });
        }

        return alerts;
    }

    /**
     * Generate risk level alerts
     */
    static async generateRiskAlert(userId, riskData) {
        const alerts = [];

        if (!riskData) return alerts;

        // High risk alert
        if (riskData.riskPercentage >= 60) {
            alerts.push({
                type: 'RISK',
                priority: 'CRITICAL',
                title: '⚠️ उच्च जोखिम की चेतावनी',
                message: `आपका ऋण जोखिम ${riskData.riskPercentage}% है। अपना वित्तीय दृष्टिकोण समीक्षा करें।`,
                data: {
                    category: 'Risk Assessment',
                    actionRequired: true,
                    actionUrl: '/agriflow/loan-calculator',
                    actionLabel: 'Adjust Loan Terms',
                    value: riskData.riskPercentage,
                    threshold: 60,
                    factors: riskData.factors
                },
                tags: ['risk', 'loan', 'warning']
            });
        }

        return alerts;
    }

    /**
     * Generate seasonal farming alerts
     */
    static generateSeasonalAlert(userId, location, season) {
        const alerts = [];
        const seasonalAdvice = {
            'monsoon': {
                title: '🌧️ मानसून के लिए तैयारी करें',
                message: 'मानसून का मौसम शुरू हो गया है। अपनी फसल को जलभराव से बचाएं।',
                tips: ['Drainage system check', 'Crop rotation planning', 'Pest management']
            },
            'summer': {
                title: '☀️ गर्मी के दौरान सिंचाई बढ़ाएं',
                message: 'गर्मी के मौसम में नियमित सिंचाई महत्वपूर्ण है।',
                tips: ['Increase irrigation frequency', 'Mulching recommended', 'Check soil moisture']
            },
            'winter': {
                title: '❄️ सर्दी की फसल लगाने का समय',
                message: 'सर्दी की फसलों के लिए यह सही समय है।',
                tips: ['Plant winter crops', 'Reduce irrigation', 'Frost protection']
            }
        };

        const advice = seasonalAdvice[season];
        if (advice) {
            alerts.push({
                type: 'SEASONAL',
                priority: 'MEDIUM',
                title: advice.title,
                message: advice.message,
                data: {
                    category: 'Seasonal Advisory',
                    actionRequired: false,
                    tips: advice.tips,
                    season: season
                },
                location: location,
                tags: ['seasonal', 'advisory', 'planning']
            });
        }

        return alerts;
    }

    /**
     * Save alerts to database
     */
    static async saveAlerts(userId, alerts) {
        try {
            const savedAlerts = [];
            for (const alert of alerts) {
                // Check if similar alert already exists (avoid duplicates)
                const existing = await Notification.findOne({
                    userId: userId,
                    type: alert.type,
                    isDismissed: false,
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                });

                if (!existing) {
                    const notification = new Notification({
                        userId: userId,
                        ...alert
                    });
                    const saved = await notification.save();
                    savedAlerts.push(saved);
                }
            }
            if (savedAlerts.length > 0) {
                console.log(`✅ Saved ${savedAlerts.length} new alerts for user ${userId}`);
            }
            return savedAlerts;
        } catch (error) {
            console.error('Error saving alerts:', error.message);
            return [];
        }
    }

    /**
     * Get all unread alerts 
     */
    static async getUnreadAlerts(userId, limit = 10) {
        try {
            const alerts = await Notification.find({
                userId: userId,
                isRead: false,
                isDismissed: false
            })
                .sort({ priority: -1, createdAt: -1 })
                .limit(limit);

            return alerts;
        } catch (error) {
            console.error('Error fetching alerts:', error.message);
            return [];
        }
    }

    /**
     * Get all alerts with pagination
     */
    static async getAllAlerts(userId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const alerts = await Notification.find({ userId: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Notification.countDocuments({ userId: userId });

            return {
                alerts,
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            };
        } catch (error) {
            console.error('Error fetching alerts:', error.message);
            return { alerts: [], total: 0, pages: 0, currentPage: page };
        }
    }

    /**
     * Mark alert as read
     */
    static async markAsRead(alertId) {
        try {
            const alert = await Notification.findByIdAndUpdate(
                alertId,
                { isRead: true, readAt: new Date() },
                { new: true }
            );
            return alert;
        } catch (error) {
            console.error('Error marking alert as read:', error.message);
            return null;
        }
    }

    /**
     * Dismiss alert
     */
    static async dismissAlert(alertId) {
        try {
            const alert = await Notification.findByIdAndUpdate(
                alertId,
                { isDismissed: true, dismissedAt: new Date() },
                { new: true }
            );
            return alert;
        } catch (error) {
            console.error('Error dismissing alert:', error.message);
            return null;
        }
    }
}

module.exports = SmartAlertEngine;
