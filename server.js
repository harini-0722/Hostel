const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const open = require("open");
const Room = require('./models/Room');
const Block = require('./models/Block');
const Student = require('./models/Student');
const ClubActivity = require('./models/ClubActivity');
const Attendance = require('./models/Attendance'); 
const cron = require('node-cron'); 
const multer = require('multer'); 
const path = require('path'); 


const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public", "login.html")));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
 // Serve your login.html etc.

// 🚀 --- Multer Image Upload Configuration ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Save files to the 'public/uploads' directory
  },
  filename: function (req, file, cb) {
    // Create a unique filename: fieldname-timestamp.ext
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
// ------------------------------------------

// ✅ MongoDB Connection
mongoose
  .connect("mongodb+srv://admin:admin123@cluster0.h4bbmg7.mongodb.net/hostelDB?retryWrites=true&w=majority")
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- User Login & Admin (No Changes) ---

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String, // 'admin' or 'student'
});
const User = mongoose.model("User", userSchema);

const createDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ username: "admin" });
  if (!existingAdmin) {
    await User.create({ username: "admin", password: "admin123", role: "admin" });
    console.log("👑 Default admin created: admin / admin123");
  }
};
createDefaultAdmin();

app.post("/login", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    let redirect = "";
    
    if (role === "admin") {
        // Admin Login
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ message: "Invalid Admin credentials" });
        }
        redirect = "/admin.html";
        // <<< MODIFICATION 1: Send JSON response for admin
        res.json({ message: "Login successful", redirect });

    } else if (role === "student") {
        // Student Login
        const student = await Student.findOne({ username, password });
        if (!student) {
            return res.status(401).json({ message: "Invalid Student credentials" });
        }
        redirect = "/student.html"; // 👈 This is their new page

        // <<< MODIFICATION 1 (Continued): Send studentId back
        res.json({ message: "Login successful", redirect, studentId: student._id });

    } else {
        return res.status(400).json({ message: "Invalid role selected" });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Hostel API Routes (Cleaned Up) ---

/**
 * 🚀 GET ALL DATA
 * This is the "get all my blocks and rooms" job.
 */
app.get("/api/blocks", async (req, res) => {
  try {
    const blocks = await Block.find({})
      .populate({ // This tells the server: "Get all the room details, too"
        path: 'rooms',
        populate: {
          path: 'students' // And get the student details inside the rooms
        }
      })
      .sort({ createdAt: 'desc' });
    res.json({ success: true, blocks }); // Send all the blocks back
  } catch (error) {
    console.error("❌ Error fetching blocks:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 🏢 ADD NEW BLOCK
 * This is the "add a new block" job.
 */
app.post("/api/blocks", async (req, res) => {
  try {
    const { blockName, uniqueKey, themeColor } = req.body;
    console.log("📦 Received Block:", req.body);

    if (!blockName || !uniqueKey || !themeColor)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const existing = await Block.findOne({ blockKey: uniqueKey });
    if (existing)
      return res.status(400).json({ success: false, message: "Block key already exists!" });

    const newBlock = new Block({
      blockName,
      blockKey: uniqueKey,
      blockTheme: themeColor,
      rooms: [] // Start with an empty "drawer" for rooms
    });

    await newBlock.save();
    res.status(201).json({ success: true, message: "✅ Block added successfully!", block: newBlock });
  } catch (error) {
    console.error("❌ Error adding block:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// ADD NEW ROOM (to a specific Block)
app.post('/api/rooms', async (req, res) => {
  try {
    // 1. Get all the details from the form
    const { roomNumber, floor, capacity, blockKey } = req.body; 

    if (!roomNumber || !floor || !capacity || !blockKey) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // 2. Find the parent block (the "drawer") using its unique key
    const parentBlock = await Block.findOne({ blockKey: blockKey });
    if (!parentBlock) {
        return res.status(404).json({ success: false, message: 'Block not found.' });
    }

    // 3. Create the new room (the "toy")
    const newRoom = new Room({
        roomNumber,
        floor,
        capacity,
        block: parentBlock._id, // 👈 This links the room TO the block
        students: []
    });
    await newRoom.save();

    // 4. Put the new room's ID into the block's "drawer"
    parentBlock.rooms.push(newRoom._id); // 👈 This links the block TO the room
    await parentBlock.save();
    
    res.status(201).json({ success: true, message: 'Room added successfully!', room: newRoom });
  } catch (error) {
    console.error("❌ Error adding room:", error);
    res.status(500).json({ success: false, message: 'Error adding room' });
  }
});
// ... (after your /api/rooms route) ...

/**
 * 🧑‍🎓 ADD NEW STUDENT (to a specific Room)
 * This is the new "add a student" job.
 */
app.post('/api/students', async (req, res) => {
    try {
        // 1. Get all the data from the form
        const {
            roomId, name, course, department, year, email, phone,
            feeStatus, paymentMethod, joiningDate, username, password
        } = req.body;

        if (!roomId || !name || !username || !password) {
            return res.status(400).json({ success: false, message: 'Room, Name, Username, and Password are required.' });
        }

        // 2. Find the parent room
        const parentRoom = await Room.findById(roomId);
        if (!parentRoom) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        // 3. Check if room is full
        if (parentRoom.students.length >= parentRoom.capacity) {
            return res.status(400).json({ success: false, message: 'This room is already full.' });
        }

        // 4. Check if username is already taken
        const existingStudent = await Student.findOne({ username: username });
        if (existingStudent) {
            return res.status(400).json({ success: false, message: 'This username is already taken. Please choose another.' });
        }
        
        // 5. Create the new student
        const newStudent = new Student({
            room: roomId, name, course, department, year, email, phone,
            feeStatus, paymentMethod, joiningDate, username, password
        });
        await newStudent.save();

        // 6. Add the new student's ID to the parent room's 'students' array
        parentRoom.students.push(newStudent._id);
        await parentRoom.save();

        res.status(201).json({ success: true, message: 'Student added successfully!' });

    } catch (error) {
        console.error("❌ Error adding student:", error);
        res.status(500).json({ success: false, message: 'Error adding student' });
    }
});
/**
 * 🧑‍🎓 GET SINGLE STUDENT PROFILE
 * This job finds one student and all their info.
 */
app.get('/api/student/:id', async (req, res) => {
    try {
        const studentId = req.params.id;

        // 1. Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        // 2. Find their room
        const room = await Room.findById(student.room);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found for student.' });
        }

        // 3. Find their block
        const block = await Block.findById(room.block);
        if (!block) {
            return res.status(404).json({ success: false, message: 'Block not found for room.' });
        }
        
        // <<< MODIFICATION 2: Find real roommates
        const roommates = await Student.find({
            room: room._id,         // Find students in the same room
            _id: { $ne: studentId } // But not the student themselves
        });

       // --- 4. Find their REAL attendance log ---
        const realAttendance = await Attendance.find({ student: studentId })
            .sort({ date: -1 }) // Get newest records first
            .limit(30); // Get the last 30 records
        
        const mockComplaints = [
            { title: 'Leaky Faucet in Washroom', status: 'Pending', date: '2025-10-20' },
            { title: 'Wi-Fi speed is very slow in the evening', status: 'Pending', date: '2025-10-18' },
            { title: 'Study lamp bulb fused', status: 'Resolved', date: '2025-10-15' },
        ];
        // --- End of Mock Data ---


        // 4. Send all the data back
        res.json({
            success: true,
            student: student,
            room: room, // Send full room object
            block: block, // Send full block object
            roommates: roommates, // <<< MODIFICATION 2 (Continued)
            // 🚀 CHANGED: This now sends the real data
            attendance: realAttendance, 
            complaints: mockComplaints   // Sending fake data for now
        });

    } catch (error) {
        console.error("❌ Error fetching student profile:", error);
        res.status(500).json({ success: false, message: 'Error fetching student profile' });
    }
});
/**
 * 🗑️ DELETE ROOM
 * This job deletes a room AND all the students in it.
 */
app.delete('/api/rooms/:id', async (req, res) => {
    try {
        const roomId = req.params.id;

        // 1. Find the room to be deleted
        const roomToDelete = await Room.findById(roomId);
        if (!roomToDelete) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        const blockId = roomToDelete.block; // Get the ID of the parent block

        // 2. Delete all students associated with this room
        await Student.deleteMany({ room: roomId }); 
        console.log(`🧹 Deleted students from room ${roomId}`);

        // 3. Remove the room's ID from the parent block's 'rooms' array
        await Block.findByIdAndUpdate(blockId, { $pull: { rooms: roomId } });
        console.log(`📫 Removed room ${roomId} from block ${blockId}`);

        // 4. Delete the room itself
        await Room.findByIdAndDelete(roomId);
        console.log(`🗑️ Deleted room ${roomId}`);

        res.json({ success: true, message: 'Room and associated students deleted successfully!' });

    } catch (error) {
        console.error("❌ Error deleting room:", error);
        res.status(500).json({ success: false, message: 'Error deleting room' });
    }
});

/**
 * 🗑️ DELETE STUDENT (Remove from room and delete record)
 * This job removes a student from their room and deletes their record.
 */
app.delete('/api/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;

        // 1. Find the student to be deleted
        const studentToDelete = await Student.findById(studentId);
        if (!studentToDelete) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const roomId = studentToDelete.room; // Get the ID of the parent room

        // 2. Remove the student's ID from the parent room's 'students' array
        if (roomId) { // Check if student was actually assigned to a room
           await Room.findByIdAndUpdate(roomId, { $pull: { students: studentId } });
           console.log(`🚪 Removed student ${studentId} from room ${roomId}`);
        }

        // 3. Delete the student record itself
        await Student.findByIdAndDelete(studentId);
        console.log(`🗑️ Deleted student ${studentId}`);

        res.json({ success: true, message: 'Student removed successfully!' });

    } catch (error) {
        console.error("❌ Error removing student:", error);
        res.status(500).json({ success: false, message: 'Error removing student' });
    }
});
/**
 * 🗑️ DELETE BLOCK
 * This job deletes a block, all its rooms, and all students in those rooms.
 */
app.delete('/api/blocks/:id', async (req, res) => {
    try {
        const blockId = req.params.id;

        // 1. Find the block
        const blockToDelete = await Block.findById(blockId);
        if (!blockToDelete) {
            return res.status(404).json({ success: false, message: 'Block not found.' });
        }

        // 2. Get all room IDs from the block
        const roomIds = blockToDelete.rooms;

        if (roomIds && roomIds.length > 0) {
            // 3. Delete all students associated with these rooms
            await Student.deleteMany({ room: { $in: roomIds } });
            console.log(`🧹 Deleted all students from ${roomIds.length} rooms in block ${blockId}`);

            // 4. Delete all rooms in the block
            await Room.deleteMany({ _id: { $in: roomIds } });
            console.log(`🗑️ Deleted ${roomIds.length} rooms from block ${blockId}`);
        }

        // 5. Delete the block itself
        await Block.findByIdAndDelete(blockId);
        console.log(`💥 Deleted block ${blockId}`);

        res.json({ success: true, message: 'Block, rooms, and students deleted successfully!' });

    } catch (error) {
        console.error("❌ Error deleting block:", error);
        res.status(500).json({ success: false, message: 'Error deleting block' });
    }
});

// 🚀 --- CLUB ACTIVITY API ROUTES ---

/**
 * 🎨 GET ALL CLUB ACTIVITIES
 * Fetches all activities, newest first.
 */
app.get('/api/activities', async (req, res) => {
  try {
    const activities = await ClubActivity.find({}).sort({ createdAt: 'desc' });
    res.json({ success: true, activities });
  } catch (error) {
    console.error("❌ Error fetching activities:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 🎨 ADD NEW CLUB ACTIVITY
 * Uses multer 'upload.single("image")' to handle the file.
 */
app.post('/api/activities', upload.single('image'), async (req, res) => {
  try {
    const { title, type, date, description } = req.body;
    
    // The file is available at req.file
    let imageUrl = '';
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename; // Get the public path
    }

    if (!title || !type || !date) {
        return res.status(400).json({ success: false, message: "Title, Type, and Date are required" });
    }

    const newActivity = new ClubActivity({
        title,
        type,
        date,
        description,
        imageUrl: imageUrl
    });

    await newActivity.save();
    res.status(201).json({ success: true, message: "✅ Activity added successfully!", activity: newActivity });
  } catch (error) {
    console.error("❌ Error adding activity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 🎨 DELETE CLUB ACTIVITY
 * Deletes an activity by its ID.
 */
app.delete('/api/activities/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const activity = await ClubActivity.findById(activityId);

        if (!activity) {
            return res.status(404).json({ success: false, message: 'Activity not found.' });
        }
        
        // Note: This only deletes the DB record, not the file from /public/uploads
        // For a full-featured app, you'd add: fs.unlinkSync('public' + activity.imageUrl)
        
        await ClubActivity.findByIdAndDelete(activityId);
        res.json({ success: true, message: 'Activity deleted successfully!' });

    } catch (error) {
        console.error("❌ Error deleting activity:", error);
        res.status(500).json({ success: false, message: 'Error deleting activity' });
    }
});
// 🚀 --- ATTENDANCE API ROUTES ---

// Helper function to get the start of today
function getTodayStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight this morning
    return today;
}

/**
 * 🌙 NIGHTLY CRON JOB - Mark Absentees
 * This runs every day at 11:59 PM.
 * It loops through all students and marks anyone as 'Absent'
 * who does not have a 'Present' or 'Leave' record for the day.
 */
cron.schedule('59 23 * * *', async () => {
    console.log('🌙 Running nightly job: Marking absentees...');
    const todayStart = getTodayStart();
    
    try {
        const allStudents = await Student.find({}, '_id'); // Get all student IDs
        let absentCount = 0;

        // Loop through every student
        for (const student of allStudents) {
            // Check if a record *already exists* for this student today
            const existingRecord = await Attendance.findOne({
                student: student._id,
                date: todayStart
            });

            // If no record exists, create an 'Absent' one
            if (!existingRecord) {
                await Attendance.create({
                    student: student._id,
                    date: todayStart,
                    status: 'Absent'
                });
                absentCount++;
            }
        }
        console.log(`🌙 Nightly job complete: ${absentCount} students marked as Absent.`);
    } catch (error) {
        console.error('❌ Error in nightly cron job:', error);
    }
}, {
    timezone: "Asia/Kolkata" // Set to your timezone
});


/**
 * 💡 GET CURRENT ATTENDANCE STATUS
 * Gets the student's status for the dashboard card.
 */
app.get('/api/attendance/status/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const todayStart = getTodayStart();

        const record = await Attendance.findOne({
            student: studentId,
            date: todayStart
        });

        if (!record) {
            // No record yet for today
            return res.json({ success: true, status: 'Checked Out', lastActionTime: null });
        }

        if (record.checkInTime && !record.checkOutTime) {
            // They are checked IN
            return res.json({ success: true, status: 'Checked In', lastActionTime: record.checkInTime });
        } else {
            // They are checked OUT (or were absent and never checked in)
            return res.json({ success: true, status: 'Checked Out', lastActionTime: record.checkOutTime });
        }

    } catch (error) {
        console.error("❌ Error getting attendance status:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


/**
 * 🔘 POST TOGGLE ATTENDANCE
 * The main route for the Check In / Check Out button.
 */
app.post('/api/attendance/toggle', async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student ID is required.' });
        }
        
        const todayStart = getTodayStart();
        const now = new Date();

        // Find today's record for this student
        const existingRecord = await Attendance.findOne({
            student: studentId,
            date: todayStart
        });

        if (!existingRecord) {
            // --- CASE 1: First action of the day. Checking IN. ---
            const newRecord = await Attendance.create({
                student: studentId,
                date: todayStart,
                status: 'Present', // Mark them present
                checkInTime: now    // Set check-in time
            });
            return res.json({ 
                success: true, 
                newStatus: 'Checked In', 
                lastActionTime: newRecord.checkInTime 
            });
        }
        
        // --- CASE 2: Record exists. Toggle the state. ---
        if (existingRecord.checkInTime && !existingRecord.checkOutTime) {
            // --- They are currently IN, so they are Checking OUT. ---
            existingRecord.checkOutTime = now;
            await existingRecord.save();
            return res.json({ 
                success: true, 
                newStatus: 'Checked Out', 
                lastActionTime: existingRecord.checkOutTime 
            });
        } else {
            // --- They are currently OUT, so they are Checking IN. ---
            existingRecord.checkInTime = now;
            existingRecord.checkOutTime = null; // Clear the check-out time
            existingRecord.status = 'Present'; // Ensure they are marked Present
            await existingRecord.save();
            return res.json({ 
                success: true, 
                newStatus: 'Checked In', 
                lastActionTime: existingRecord.checkInTime 
            });
        }

    } catch (error) {
        console.error("❌ Error toggling attendance:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 🚀 --- END OF ATTENDANCE API ROUTES ---
// ✅ Start the server
app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  await open(`http://localhost:${PORT}/login.html`);
});