const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['WEATHER', 'LOAN', 'INCOME', 'SOIL', 'RISK', 'SEASONAL', 'PAYMENT_DUE', 'CRITICAL'],
        required: true,
        index: true
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    description: String,

    // Alert metadata
    data: {
        category: String,
        actionRequired: Boolean,
        actionUrl: String,
        actionLabel: String,
        value: mongoose.Schema.Types.Mixed,
        threshold: mongoose.Schema.Types.Mixed,
        severity: String
    },

    // Location data if relevant
    location: {
        city: String,
        state: String,
        latitude: Number,
        longitude: Number
    },

    // Status tracking
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    isDismissed: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    dismissedAt: Date,

    // Creation timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: Date,

    // Tags for filtering
    tags: [String]
}, { timestamps: true });

// TTL Index for automatic expiration
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Index for common queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
