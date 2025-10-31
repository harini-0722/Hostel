const mongoose = require('mongoose');

const clubActivitySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['Sports', 'Cultural', 'Technical', 'Workshop', 'General']
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String
    },
    imageUrl: {
        type: String // We will store the path to the image, e.g., /uploads/image.png
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

const ClubActivity = mongoose.model('ClubActivity', clubActivitySchema);

module.exports = ClubActivity;