// src/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";

const API = process.env.REACT_APP_API_URL || "https://badminton-mongo.onrender.com";

const colors = {
  primary: "#10B981",
  primaryDark: "#059669",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e5e7eb",
  card: "#ffffff",
  bg: "#f8fafc",
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // 🟢 Debug log
      console.log("📌 API URL:", `${API}/api/auth/register`);
      console.log("📌 Response status:", res.status);

      const data = await res.json().catch(() => ({}));
      console.log("📌 Response body:", data);

      if (res.ok) {
        setMessage("✅ สมัครสมาชิกสำเร็จ");
        setForm({ name: "", email: "", phone: "", password: "" });
        setTimeout(() => navigate("/login"), 700);
      } else {
        setMessage(`❌ ${data?.error || "สมัครสมาชิกไม่สำเร็จ"}`);
      }
    } catch {
      setMessage("❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={ui.page}>
      <div style={ui.card}>
        <h1 style={ui.title}>สมัครสมาชิก</h1>
        <p style={ui.sub}>สร้างบัญชีเพื่อเริ่มจองสนาม</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          {/* Name */}
          <div style={ui.field}>
            <label htmlFor="name" style={ui.label}>ชื่อ–สกุล</label>
            <div style={ui.inputWrap}>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="สมหมาย หมายปอง"
                value={form.name}
                onChange={handleChange}
                required
                style={ui.input}
              />
            </div>
          </div>

          {/* Email */}
          <div style={ui.field}>
            <label htmlFor="email" style={ui.label}>อีเมล</label>
            <div style={ui.inputWrap}>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                style={ui.input}
              />
            </div>
          </div>

          {/* Phone */}
          <div style={ui.field}>
            <label htmlFor="phone" style={ui.label}>เบอร์โทร</label>
            <div style={ui.inputWrap}>
              <input
                id="phone"
                type="text"
                name="phone"
                placeholder="0812345678"
                value={form.phone}
                onChange={handleChange}
                required
                style={ui.input}
              />
            </div>
          </div>

          {/* Password */}
          <div style={ui.field}>
            <label htmlFor="password" style={ui.label}>รหัสผ่าน</label>
            <div style={ui.inputWrap}>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                style={ui.input}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={ui.eyeBtn}
              >
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button type="submit" style={{ ...ui.button, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>

        {message && <p style={ui.message}>{message}</p>}

        <p style={ui.helper}>
          มีบัญชีอยู่แล้ว? <Link to="/login" style={ui.link}>ไปหน้า Login</Link>
        </p>
      </div>
    </div>
  );
}

const ui = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: colors.bg,
    padding: 20,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
    color: colors.ink,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(2,6,12,0.06)",
    padding: "28px 32px",
  },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: colors.ink, textAlign: "center" },
  sub: { margin: "6px 0 0 0", color: colors.muted, fontSize: 14, textAlign: "center" },
  field: { marginTop: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6,textAlign: "left" },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    background: "#fff",
  },
  input: {
    flex: 1,
    padding: "12px 40px 12px 14px",
    border: "none",
    outline: "none",
    fontSize: 14,
    borderRadius: 12,
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    color: colors.muted,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: "100%",
    marginTop: 20,
    padding: "12px 14px",
    background: colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    transition: "background 0.2s",
  },
  message: { marginTop: 12, textAlign: "center", fontSize: 14 },
  helper: { marginTop: 16, textAlign: "center", color: colors.muted, fontSize: 14 },
  link: { color: colors.primaryDark, fontWeight: 700, textDecoration: "none" },
};
