const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  floor: { type: String, required: true },
  capacity: { type: Number, required: true },
  
  // This tells the room which block it belongs to
  // It is VERY important for Step 2
  block: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Block',
    required: true
  },

  // This is the "drawer" for students
  // It is VERY important for Step 3
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }]
});

module.exports = mongoose.model('Room', roomSchema);