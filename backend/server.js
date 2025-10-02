// server.js (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // Admin....
require("dotenv").config();


const app = express();
const PORT = process.env.PORT || 3000;

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
    console.log("✅ Connected to MongoDB");
    console.log("📌 Using DB:", mongoose.connection.db.databaseName);
  })
  .catch((err) => console.error("❌ MongoDB error:", err.message));


// ---------- User Schema ----------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true }, // hash password
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.model("User", userSchema);


// ---------- Booking Schema ----------
const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },   // YYYY-MM-DD
    court: { type: Number, required: true }, // คอร์ต 1-6
    hour: { type: Number, required: true },  // เช่น 9 = 9:00-10:00
    status: {
      type: String,
      enum: ["booked", "arrived", "canceled"],
      default: "booked"   // ✅ ถ้ามีการสร้าง booking ใหม่ จะเป็น "booked" โดยอัตโนมัติ
    },
  },
  { timestamps: true, collection: "bookings" }
);


const Booking = mongoose.model("Booking", bookingSchema);

// ===== Auth Middleware =====
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // เก็บข้อมูล user ไว้ใน req
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}



// ---------- Admin Seed ----------
async function createAdmin() {
  const adminEmail = "admin@gmail.com";
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    const hash = await bcrypt.hash("Admin1234!", 10); // ✅ hash password ก่อน
    await User.create({
      name: "Admin",
      email: adminEmail,      // ✅ ใช้ตัวแปรที่เป็น string ข้างบน
      phone: "0812345678",
      password: hash,         // ✅ เก็บ hash ไม่ใช่ plain text
      role: "admin",
    });
    console.log("✅ Admin user created");
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

// ---------- Admin Routes ----------
app.get("/api/admin/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } }).select("-password");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});



app.post("/api/bookings", authMiddleware, async (req, res) => {
  try {
    const { userId, date, court, hour } = req.body;

    const exist = await Booking.findOne({ date, court, hour });
    if (exist) return res.status(400).json({ error: "ช่วงเวลานี้ถูกจองแล้ว" });

    const booking = new Booking({
      user: userId,
      date,
      court,
      hour,
      status: "booked" // default
    });

    await booking.save();
    res.json({ message: "✅ จองสำเร็จ", booking });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ✏️ Soft Delete User (Admin only)
app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // เช็คว่า id ถูกต้องมั้ย
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID ไม่ถูกต้อง (ต้องเป็น ObjectId)" });
    }

    // อัปเดตค่า isDeleted = true
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
    console.error("❌ Soft delete error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});



// ---------- Routes ----------
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Badminton API!" });
});

// ➕ Register
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

    const { password: _, ...safeUser } = user.toObject();
    return res.status(201).json({ message: "สมัครสมาชิกสำเร็จ", user: safeUser });
  } catch (err) {
    console.error("❌ Register error:", err.message);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
});


// 📄 Get users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).lean();
    res.json(users);
  } catch (err) {
    console.error("❌ Get users error:", err.message);
    res.status(500).json({ error: "Server error while fetching users" });
  }
});

// 📄 Login
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    }

    // ✅ ฝัง role เข้า token ด้วย
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1d" }
    );

    const { password: _, ...safeUser } = user.toObject();
    res.json({ message: "เข้าสู่ระบบสำเร็จ", token, user: safeUser });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});


// 📄 Get user by id
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ เช็คว่า id เป็น ObjectId ถูกต้องมั้ย
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID ไม่ถูกต้อง (ต้องเป็น ObjectId)" });
    }

    const user = await User.findById(id, { password: 0 }).lean();

    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ Get user by id error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ✏️ Update user by id
app.put("/api/users/:id", async (req, res) => {
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
    console.error("❌ Update user error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});


// ---------- Profile Schema ----------
const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    emergencyName: { type: String, default: "" },   // ชื่อผู้ติดต่อฉุกเฉิน
    emergencyPhone: { type: String, default: "" },  // เบอร์โทรฉุกเฉิน
  },
  { timestamps: true, collection: "profiles" }
);

const Profile = mongoose.model("Profile", profileSchema);




// ---------- Booking Routes ----------

// ✅ ดูช่วงเวลาที่ถูกจองแล้ว
app.get("/api/bookings/taken", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "ต้องส่ง date" });

    const bookings = await Booking.find({ date });
    const taken = bookings.map((b) => `${b.court}:${b.hour}`);
    res.json({ taken });
  } catch (err) {
    console.error("❌ Get taken error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ จองสนามใหม่
app.post("/api/bookings", authMiddleware, async (req, res) => {
  try {
    const { userId, date, court, hour } = req.body;

    // ตรวจสอบซ้ำ
    const exist = await Booking.findOne({ date, court, hour });
    if (exist) return res.status(400).json({ error: "ช่วงเวลานี้ถูกจองแล้ว" });

    const booking = new Booking({
      user: userId,
      date,
      court,
      hour,
      status: "booked"   // ✅ กำหนดค่าเริ่มต้น
    });

    await booking.save();
    res.json({ message: "✅ จองสำเร็จ", booking });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ ดูการจองของ user ตามวัน
app.get("/api/bookings/my/:userId/:date", async (req, res) => {
  try {
    const { userId, date } = req.params;

    if (!date) {
      return res.status(400).json({ error: "ต้องส่ง date" });
    }

    const myBookings = await Booking.find({ user: userId, date })
      .sort({ hour: 1 });

    const mine = myBookings.map(b => `${b.court}:${b.hour}`);
    res.json({ mine });
  } catch (err) {
    console.error("❌ My bookings error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});



// POST หรือ PUT profile
app.post("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { emergencyName, emergencyPhone } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { emergencyName, emergencyPhone },
      { new: true, upsert: true } // upsert = ถ้ายังไม่มี profile ให้สร้างใหม่
    );

    res.json({ message: "อัพเดตโปรไฟล์เรียบร้อย", profile });
  } catch (err) {
    console.error("❌ Profile update error:", err.message);
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
    console.error("❌ Profile get error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});






// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
