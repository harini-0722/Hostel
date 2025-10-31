const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema(
  {
    blockName: { type: String, required: true },
    blockKey: { type: String, required: true, unique: true },
    blockTheme: { type: String, required: true },
    
    // This is the "drawer" that will hold your rooms
    // It is VERY important for Step 2
    rooms: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room' 
    }]
  },
  { timestamps: true }
);

const Block = mongoose.model("Block", blockSchema);
module.exports = Block;