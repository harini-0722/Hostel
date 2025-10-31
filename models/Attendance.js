// models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    // This date will be set to the start of the day, e.g., 'Oct 31, 12:00:00 AM'
    // This lets us easily find the record for "today".
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Leave'],
        required: true,
        default: 'Present'
    },
    // These store the exact time of the action
    checkInTime: {
        type: Date
    },
    checkOutTime: {
        type: Date
    }
}, { 
    timestamps: true // Adds createdAt and updatedAt
});

// Create a compound index to ensure one record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);