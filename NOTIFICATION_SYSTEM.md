# Smart Alert Notification System - AgriFlow

## Overview

The Smart Alert Notification System is a comprehensive, intelligent notification platform for AgriFlow that generates contextual alerts and warnings based on agricultural, financial, and weather conditions.

## Features

### 1. **Alert Types**

- **🌤️ WEATHER** - Weather hazards, extreme temperatures, rainfall warnings
- **💰 LOAN** - EMI payment reminders, overdue notifications, loan status updates
- **📊 INCOME** - Income predictions, loss warnings, growth opportunities
- **🌱 SOIL** - Soil condition alerts, nutrient recommendations
- **⚠️ RISK** - Loan risk assessment, financial warnings
- **📅 SEASONAL** - Seasonal farming advice, crop planning tips
- **💳 PAYMENT_DUE** - EMI payment due reminders
- **🚨 CRITICAL** - Critical alerts requiring immediate attention

### 2. **Priority Levels**

- **CRITICAL** (Red) - Requires immediate action
- **HIGH** (Orange) - Important, should address soon
- **MEDIUM** (Blue) - Standard alert
- **LOW** (Green) - Informational

### 3. **Smart Features**

✅ Duplicate prevention (no duplicate alerts within 24 hours)
✅ Automatic alert expiration
✅ Read/Unread tracking
✅ Dismiss functionality
✅ Real-time updates (refreshes every 30 seconds)
✅ Bilingual support (English & Hindi)
✅ Location-aware alerts
✅ Data-driven insights

---

## Architecture

### Backend Structure

```
├── models/
│   └── Notification.js           (MongoDB schema)
├── services/
│   └── SmartAlertEngine.js        (Alert generation engine)
└── index.js                        (API endpoints)
```

### Database Schema

**Notification Collection Fields:**
- `userId` - Reference to user
- `type` - Alert type (WEATHER, LOAN, etc.)
- `priority` - CRITICAL, HIGH, MEDIUM, LOW
- `title` - Alert title
- `message` - Alert message
- `description` - Additional details
- `data` - Metadata (actionUrl, actionLabel, value, threshold)
- `location` - Geographic data
- `isRead` - Read status
- `isDismissed` - Dismissed status
- `createdAt` - Creation timestamp
- `expiresAt` - Auto-deletion timestamp
- `tags` - Categories for filtering

---

## API Endpoints

### 1. Get Unread Notifications
```
GET /api/notifications/unread
Response: { status, count, alerts: [] }
```

### 2. Get All Notifications (Paginated)
```
GET /api/notifications?page=1&limit=20
Response: { status, alerts, total, pages, currentPage }
```

### 3. Mark Alert as Read
```
POST /api/notifications/:id/read
Response: { status, alert }
```

### 4. Dismiss Alert
```
POST /api/notifications/:id/dismiss
Response: { status, alert }
```

### 5. Generate Sample Alerts (Testing)
```
POST /api/notifications/generate-sample
Response: { status, message, alerts: [] }
```

### 6. Notifications Page
```
GET /agriflow/notifications
Renders: Full notifications center with filters
```

---

## How to Use

### For Users

1. **View Notifications**
   - Click the 🔔 bell icon in the navbar
   - See unread alerts in real-time
   - Visit `/agriflow/notifications` for full center

2. **Manage Alerts**
   - Mark as read to track progress
   - Dismiss to remove from list
   - Click action buttons for relevant details

3. **Filter Alerts**
   - All notifications
   - Unread only
   - By type (Weather, Loan, Income)
   - By priority (Critical)

### For Developers

#### Generating Alerts

```javascript
const SmartAlertEngine = require("./services/SmartAlertEngine");

// Generate weather alerts
const weatherAlerts = await SmartAlertEngine.generateWeatherAlert(
  userId,
  weatherData,
  location
);

// Generate loan alerts
const loanAlerts = await SmartAlertEngine.generateLoanAlert(
  userId,
  loanData
);

// Generate income alerts
const incomeAlerts = await SmartAlertEngine.generateIncomeAlert(
  userId,
  predictedIncome,
  historicalIncome
);

// Generate risk alerts
const riskAlerts = await SmartAlertEngine.generateRiskAlert(
  userId,
  riskData
);

// Generate seasonal alerts
const seasonalAlerts = SmartAlertEngine.generateSeasonalAlert(
  userId,
  location,
  season // 'monsoon', 'summer', 'winter'
);

// Save all alerts
const saved = await SmartAlertEngine.saveAlerts(userId, allAlerts);
```

#### Integration Example

```javascript
// In your weather route
app.get("/agriflow/weather", async (req, res) => {
  const weatherData = await fetchWeatherData(lat, lon);
  
  // Generate alerts
  if (req.session.userId) {
    const alerts = await SmartAlertEngine.generateWeatherAlert(
      req.session.userId,
      weatherData,
      location
    );
    await SmartAlertEngine.saveAlerts(req.session.userId, alerts);
  }
  
  res.render("agriflow-weather", { weatherData });
});
```

---

## Frontend Components

### 1. Notification Bell & Panel
**File**: `views/partials/notification-panel.ejs`

Features:
- Floating bell icon with unread count
- Dropdown panel with quick preview
- Tab switching (unread/all)
- Quick actions (mark read, dismiss)
- Mobile responsive

### 2. Notifications Center
**File**: `views/notifications.ejs`

Features:
- Full-page notification dashboard
- Statistics cards (total, unread, critical, today)
- Advanced filtering
- Grid/Card layout
- Priority color coding
- Time-ago formatting
- Pagination

### 3. Navbar Integration
**File**: `views/partials/navbar-agriflow.ejs`

- Added 🔔 Alerts link
- Dynamic badge with unread count
- Pulsing animation for urgency
- 30-second auto-refresh

---

## Example Alert Generation

### Weather Alert
```js
{
  type: "WEATHER",
  priority: "HIGH",
  title: "⚠️ भारी वर्षा की चेतावनी",
  message: "Gwalior में 55mm भारी वर्षा की संभावना है। अपनी फसल की सुरक्षा करें।",
  data: {
    category: "Weather Hazard",
    actionRequired: true,
    actionUrl: "/agriflow/weather",
    actionLabel: "View Weather Details",
    value: 55,
    threshold: 50,
    severity: "high"
  },
  location: {
    city: "Gwalior",
    state: "Madhya Pradesh",
    latitude: 26.2389,
    longitude: 78.1639
  },
  tags: ["weather", "rainfall", "hazard"]
}
```

### EMI Payment Alert
```js
{
  type: "PAYMENT_DUE",
  priority: "HIGH",
  title: "📅 EMI की किस्त की तारीख करीब है",
  message: "आपकी ₹50,000 की EMI किस्त 3 दिन में देय है।",
  data: {
    category: "Loan Payment",
    actionRequired: true,
    actionUrl: "/agriflow",
    actionLabel: "View Loan Details",
    value: 50000,
    daysRemaining: 3
  },
  tags: ["loan", "payment", "emi"]
}
```

---

## Configuration

### Alert Thresholds

**Weather Alerts:**
- Rainfall > 50mm → HIGH
- Temperature > 40°C → HIGH
- Humidity < 20% → MEDIUM

**Income Alerts:**
- Income decrease > 20% → HIGH
- Income increase > 25% → LOW

**Risk Alerts:**
- Risk percentage ≥ 60% → CRITICAL

**Payment Alerts:**
- Payment due ≤ 7 days → MEDIUM/HIGH
- Payment overdue → CRITICAL

---

## Testing

### Generate Sample Alerts
```bash
# Using cURL
curl -X POST http://localhost:3000/api/notifications/generate-sample

# Using browser
POST /api/notifications/generate-sample
```

### Check Alerts in MongoDB
```js
db.notifications.find({ 
  userId: ObjectId("...") 
}).sort({ createdAt: -1 })
```

---

## Security

✅ Authentication required for all alert endpoints
✅ User can only see their own alerts
✅ HTTPS ready
✅ XSS protection in templates
✅ MongoDBinjection prevention

---

## Performance Optimization

- **Pagination**: Load 20 alerts per page
- **Indexing**: Multiple indexes for fast queries
- **TTL Index**: Auto-delete expired alerts
- **Caching**: 30-second client-side refresh
- **Duplicate Prevention**: 24-hour window

---

## Future Enhancements

🚀 Email notifications
🚀 SMS alerts for critical issues
🚀 Push notifications
🚀 Notification preferences/settings
🚀 Advanced filtering UI
🚀 Export alerts to CSV
🚀 Analytics dashboard
🚀 Alert templates customization

---

## Troubleshooting

### Alerts Not Showing?
- Check if user is authenticated
- Verify MongoDB connection
- Check browser console for errors
- Ensure notification panel is included in layout

### Duplicate Alerts?
- Alerts are deduplicated within 24 hours
- Check if existing alert is marked as dismissed

### Performance Issues?
- Check MongoDB indexes
- Verify pagination parameters
- Check network tab for slow API calls

---

## Support

For issues or questions:
1. Check server logs: `node index.js`
2. Verify MongoDB connection
3. Test API endpoints manually
4. Check browser console for errors

---

## Created Components

✅ Models: Notification.js
✅ Services: SmartAlertEngine.js
✅ Views: notifications.ejs, notification-panel.ejs
✅ Routes: /agriflow/notifications, /api/notifications/*
✅ Navbar: Updated with notification bell

---

**Last Updated:** April 4, 2026
**Version:** 1.0
**Status:** Production Ready ✅
