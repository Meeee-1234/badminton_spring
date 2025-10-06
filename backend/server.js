
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();


const app = express();
const PORT = process.env.PORT || 3000;


// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


// ---------- CORS ----------
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://badminton-mongo.vercel.app",
      "https://badminton-hzwm.vercel.app"
        ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());


// ---------- Connect MongoDB ----------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    console.log("Using DB:", mongoose.connection.db.databaseName);
  })
  .catch((err) => console.error("MongoDB error:", err.message));


// ---------- User Schema ----------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true }, 
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.model("User", userSchema);


// ---------- Profile Schema ----------
const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    emergencyName: { type: String, default: "" },  
    emergencyPhone: { type: String, default: "" },  
  },
  { timestamps: true, collection: "profiles" }
);

const Profile = mongoose.model("Profile", profileSchema);


// ---------- Booking Schema ----------
const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    court: { type: Number, required: true }, 
    hour: { type: Number, required: true }, 
    status: { 
      type: String, 
      enum: ["booked", "arrived", "canceled"], 
      default: "booked"  
    },
  },
  { timestamps: true, collection: "bookings" }
);

const Booking = mongoose.model("Booking", bookingSchema);


// ---------- Admin Seed ----------
async function createAdmin() {
  const adminEmail = "admin@gmail.com";
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    const hash = await bcrypt.hash("Admin1234!", 10); 
    await User.create({
      name: "Admin",
      email: adminEmail,      
      phone: "0812345678",
      password: hash,        
      role: "admin",
    });
    console.log("Admin user created");
  }
}
createAdmin();


// ---------- Middleware ----------
function isAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin only" });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}


// ตรวจสอบ user ที่ login + ไม่ถูกลบ
function authRequired(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");

    User.findById(decoded.id).then(user => {
      if (!user || user.isDeleted) {
        return res.status(403).json({ error: "บัญชีนี้ถูกปิดการใช้งาน" });
      }
      req.user = user;
      next();
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}


// ---------- Admin Routes ----------
// รายชื่อผู้ใช้งานทั้งหมด (ยังไม่ถูกลบ)
app.get("/api/admin/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } }).select("-password");

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ดึงประวัติการจองทั้งหมดของ user
app.get("/api/admin/bookings", isAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().populate("user", "name email");

    const formatted = bookings.map((b) => ({
      _id: b._id,
      user: b.user ? { name: b.user.name, email: b.user.email } : null,
      date: b.date,
      court: b.court,
      hour: b.hour,
      status: b.status,
    }));
    res.json({ bookings: formatted });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});


// Soft Delete User (Admin only)
app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID ไม่ถูกต้อง (ต้องเป็น ObjectId)" });
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    res.json({
      message: "ปิดการใช้งานบัญชีเรียบร้อยแล้ว (Soft Delete)",
      user
    });
  } catch (err) {
    console.error("Soft delete error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});


// Update booking status (Admin only)
app.put("/api/admin/bookings/:id/status", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["booked", "arrived", "canceled"].includes(status)) {
      return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("user", "name email");

    if (!booking) {
      return res.status(404).json({ error: "ไม่พบการจอง" });
    }

    res.json({ message: "อัพเดตสถานะเรียบร้อย", booking });
  } catch (err) {
    console.error("Update booking status error:", err.message);
    res.status(500).json({ error: "Server error" });
 }
});


// ---------- Routes ----------
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Badminton API!" });
});

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res
        .status(400)
        .json({ error: "กรอกข้อมูลให้ครบ name, email, phone, password" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้แล้ว" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hash });

    // ป้องกันไม่ให้ส่ง password กลับไปที่ client
    const { password: _, ...safeUser } = user.toObject();
    return res.status(201).json({ message: "สมัครสมาชิกสำเร็จ", user: safeUser });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
});



// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "กรอกอีเมลและรหัสผ่าน" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "ไม่พบบัญชีนี้" });
    }

    if (user.isDeleted) {
      return res.status(403).json({ error: "บัญชีนี้ถูกปิดการใช้งาน" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1d" } // token มีอายุ 1 วัน
    );

    const { password: _, ...safeUser } = user.toObject();
    res.json({ message: "เข้าสู่ระบบสำเร็จ", token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});


// Get user by id
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID ไม่ถูกต้อง (ต้องเป็น ObjectId)" });
    }

    const user = await User.findById(id, { password: 0 }).lean();

    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user by id error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});


// Update user by id
app.patch("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID ไม่ถูกต้อง (ต้องเป็น ObjectId)" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { name, phone },
      { new: true, runValidators: true, projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    res.json({ message: "อัพเดตข้อมูลเรียบร้อยแล้ว", user });
  } catch (err) {
    console.error("Update user error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});


// ---------- Booking Routes ----------
// check สนามกับเวลาไหนที่ถูกจองไปแล้ว
app.get("/api/bookings/taken", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: "ต้องส่ง date รูปแบบ YYYY-MM-DD" });
    }

    // ป้องกันไม่ให้เก็บ cache ของ response ไว้ เพราะว่าข้อมูลมันมีการเปลี่ยนแปลงตลอด
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
    }); 

    const ACTIVE = ["booked", "arrived"]; 

    const rows = await Booking.find(
      { date, status: { $in: ACTIVE } },
      { court: 1, hour: 1, status: 1, _id: 0 }
    ).lean();

    const taken = rows.map(r => ({
      key: `${r.court}:${r.hour}`, // 2:6
      status: r.status
    }));

    return res.json({ taken });
  } catch (err) {
    console.error("Get taken error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


// จองสนามใหม่ (ต้อง login)
app.post("/api/bookings", authRequired, async (req, res) => {
  try {
    const { date, court, hour, note } = req.body;
    const userId = req.user._id; // เอาจาก token โดยตรง ไม่ต้องให้ client ส่ง

    if (!date || court == null || hour == null) {
      return res.status(400).json({ error: "ต้องส่ง date, court, hour" });
    }

    const exists = await Booking.findOne({ 
      date, 
      court, 
      hour, 
      status: { $in: ["booked", "arrived"] } 
    });
    if (exists) {
      return res.status(409).json({ error: "ช่วงเวลานี้ถูกจองแล้ว" });
    }

    const booking = await Booking.create({
      user: userId,
      date,
      court,
      hour,
      note,
      status: "booked"
    });

    res.status(201).json({ message: "จองสำเร็จ", booking });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ดึงการจองทั้งหมดของ user
app.get("/api/bookings/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID ไม่ถูกต้อง" });
    }

    const bookings = await Booking.find({ user: userId })
      .sort({ date: -1, hour: 1 }); // เรียงวันที่ล่าสุดก่อน

    res.json({ bookings });
  } catch (err) {
    console.error("User bookings error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


// ดูการจองของ user ตามวัน (ไม่เอาที่ถูกยกเลิก)
app.get("/api/bookings/my/:userId/:date", async (req, res) => {
  try {
    const { userId, date } = req.params;

    if (!userId) return res.status(400).json({ error: "ต้องส่ง userId" });
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "ต้องส่ง date รูปแบบ YYYY-MM-DD" });
    }

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
    });

    const allowed = ["booked", "checked_in"];

    const myBookings = await Booking.find(
      { user: userId, date, status: { $in: allowed } },
      { court: 1, hour: 1, _id: 0 }
    )
      .sort({ hour: 1 })
      .lean();

    const mine = (myBookings || []).map((b) => `${Number(b.court)}:${Number(b.hour)}`); // 1:9 , 2:10

    return res.json({ mine });
  } catch (err) {
    console.error("My bookings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


// profile
app.post("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { emergencyName, emergencyPhone } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { emergencyName, emergencyPhone },
      { new: true, upsert: true } // upsert ถ้ายังไม่มี profile ให้สร้างใหม่
    );

    res.json({ message: "อัพเดตโปรไฟล์เรียบร้อย", profile });
  } catch (err) {
    console.error("Profile update error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await Profile.findOne({ user: userId });

    if (!profile) {
      return res.status(404).json({ error: "ไม่พบโปรไฟล์" });
    }

    res.json(profile);
  } catch (err) {
    console.error("Profile get error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


