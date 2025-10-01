// server.js  (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- Connect MongoDB ----------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB (db: badminton)"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ---------- User Schema ----------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true }, // เก็บ hash
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.model("User", userSchema);

// ---------- Routes ----------
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Badminton!" });
});

// ➕ Register (insert user)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "กรอกข้อมูลให้ครบ name, email, phone, password" });
    }

    // เช็คอีเมลซ้ำ
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้แล้ว" });
    }

    // แฮช password
    const hash = await bcrypt.hash(password, 10);

    // สร้าง user
    const user = await User.create({ name, email, phone, password: hash });

    // return โดยไม่ส่ง password ออกไป
    const { password: _, ...safeUser } = user.toObject();
    return res.status(201).json({ message: "สมัครสมาชิกสำเร็จ", user: safeUser });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// 📄 Get users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, { password: 0 }).lean(); // ซ่อน password
  res.json(users);
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
