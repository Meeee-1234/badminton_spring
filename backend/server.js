// server.js (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ---------- CORS ----------
app.use(
  cors({
    origin: [
      "http://localhost:3000", // dev local
      "https://badminton-mongo.vercel.app", // ✅ domain frontend จริง
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

// 🔑 Login
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

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const { password: _, ...safeUser } = user.toObject();
    res.json({ message: "เข้าสู่ระบบสำเร็จ", token, user: safeUser });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// 📄 Get all users (admin)
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).lean();
    res.json(users);
  } catch (err) {
    console.error("❌ Get users error:", err.message);
    res.status(500).json({ error: "Server error while fetching users" });
  }
});

// 📄 Get profile (ต้องส่ง token มาด้วยใน header)
app.get("/api/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id, { password: 0 }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("❌ Profile error:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
