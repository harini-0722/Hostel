const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    block: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Block',
        required: true
    },
    location: {
        type: String,
        required: true
    },
    issueType: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'In Progress', 'Resolved'],
        default: 'Pending'
    },
    priority: {
        type: String,
        required: true,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;