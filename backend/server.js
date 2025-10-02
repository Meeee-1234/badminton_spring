// server.js (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
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
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.model("User", userSchema);

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

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "กรอกอีเมลและรหัสผ่าน" });
    }

    // หา user ตาม email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "ไม่พบบัญชีนี้" });
    }

    // เทียบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    }

    // 🔑 สร้าง token (ใช้ jwt)
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "supersecret", // ตั้งค่าใน .env
      { expiresIn: "1d" }
    );

    // ตัด password ออก
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
















// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
