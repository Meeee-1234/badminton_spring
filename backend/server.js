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
    date: { type: String, required: true }, // YYYY-MM-DD
    court: { type: Number, required: true }, // คอร์ต 1-6
    hour: { type: Number, required: true },  // ชั่วโมง เช่น 9 = 9:00-10:00
    status: { 
      type: String, 
      enum: ["booked", "arrived", "canceled"], 
      default: "booked"   // เวลาจองใหม่ → สถานะ = จองแล้ว
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


// ✅ ตรวจสอบ user ที่ login + ไม่ถูกลบ
function authRequired(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");

    User.findById(decoded.id).then(user => {
      if (!user || user.isDeleted) {
        return res.status(403).json({ error: "บัญชีนี้ถูกปิดการใช้งาน" });
      }
      req.user = user; // เก็บ user ไว้ใช้ใน route
      next();
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}


// ---------- Admin Routes ----------
app.get("/api/admin/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } }).select("-password");

    const formatted = users.map((u) => ({
      ...u.toObject(),
      createdAt: new Date(u.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
      updatedAt: new Date(u.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
    }));

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});


app.get("/api/admin/bookings", isAdmin, async (req, res) => {
  try {
    const { date } = req.query; // 👈 1. ดึงค่า 'date' จาก query parameter

    // 2. สร้าง object สำหรับการกรองข้อมูลในฐานข้อมูล
    const filter = {};
    if (date) {
      filter.date = date; // ถ้ามี date ให้เพิ่มเงื่อนไขการกรอง
    }

    // 3. ใช้ filter ในคำสั่ง find()
    const bookings = await Booking.find(filter).populate("user", "name email");

    const formatted = bookings.map((b) => ({
      _id: b._id,
      userName: b.user?.name || "-",
      date: b.date,
      court: b.court,
      hour: b.hour,
      status: b.status,
      createdAt: new Date(b.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
      updatedAt: new Date(b.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
    }));
    res.json({ bookings: formatted });
  } catch (err) {
    console.error("❌ Failed to fetch bookings:", err.message);
    res.status(500).json({ error: "Failed to fetch bookings" });
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

    // ✅ ถ้าโดน Soft Delete → ห้ามเข้า
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

// ✅ จองสนาม (ต้อง login)
app.post("/api/bookings", authRequired, async (req, res) => {
  const { date, court, hour, note } = req.body;
  const userId = req.user._id; // ใช้จาก token

  if (!date || court == null || hour == null) {
    return res.status(400).json({ error: "ต้องส่ง date, court, hour" });
  }

  const exists = await Booking.findOne({ date, court, hour });
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

    const formatted = {
      ...profile.toObject(),
      createdAt: new Date(profile.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
      updatedAt: new Date(profile.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
    };

    res.json(profile);
  } catch (err) {
    console.error("❌ Profile get error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ Update booking status (Admin only)
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
    console.error("❌ Update booking status error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ ดึงการจองทั้งหมดของ user
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
    console.error("❌ User bookings error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});



// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
