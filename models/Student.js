// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    // Personal Details
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },

    // Academic Details
    course: { type: String },
    department: { type: String }, // 👈 New
    year: { type: String },
    
    // Hostel Details
    joiningDate: { type: Date, default: Date.now }, // 👈 New
    feeStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
    paymentMethod: { type: String }, // 👈 New
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    
    // Login Details
    username: { type: String, required: true, unique: true }, // 👈 New
    password: { type: String, required: true } // 👈 New

}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);