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
      "http://localhost:3000", // dev local
      "https://badminton-mongo.vercel.app", // ✅ เปลี่ยนเป็น domain frontend จริงของคุณ
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

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
