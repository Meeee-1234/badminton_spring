// src/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/** พาเลตให้ใกล้เคียงแบบตัวอย่าง */
const colors = {
  bg: "#ffffff",         // พื้นหลังเพจขาว
  card: "#e5e7eb",       // การ์ดเทาอ่อน (คล้ายในรูป)
  input: "#d1d5db",      // ช่องกรอกเทาเข้มขึ้น
  ink: "#0f172a",
  muted: "#6b7280",
  line: "#e5e7eb",
  green: "#2e7d32",      // ปุ่มเขียวหลัก
  greenHover: "#1b5e20", // hover
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
      const data = await res.json().catch(() => ({}));

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
      {/* โลโก้จาก public/image/logo.png */}
      <div style={ui.logoWrap}>
        <img src="/image/logo.png" alt="Badminton Logo" style={ui.logo} />
        <div style={ui.brandText}>BADMINTON</div>
      </div>

      <div style={ui.card}>
        <h1 style={ui.title}>Register</h1>

        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          {/* Username */}
          <div style={ui.field}>
            <label htmlFor="name" style={ui.label}>Username</label>
            <div style={ui.inputWrap}>
              <input
                id="name"
                type="text"
                name="name"
                placeholder=""
                value={form.name}
                onChange={handleChange}
                required
                style={ui.input}
              />
            </div>
          </div>

          {/* Email */}
          <div style={ui.field}>
            <label htmlFor="email" style={ui.label}>Email</label>
            <div style={ui.inputWrap}>
              <input
                id="email"
                type="email"
                name="email"
                placeholder=""
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
            <label htmlFor="phone" style={ui.label}>Phone number</label>
            <div style={ui.inputWrap}>
              <input
                id="phone"
                type="text"
                name="phone"
                placeholder=""
                value={form.phone}
                onChange={handleChange}
                required
                style={ui.input}
              />
            </div>
          </div>

          {/* Password */}
          <div style={ui.field}>
            <label htmlFor="password" style={ui.label}>Password</label>
            <div style={ui.inputWrap}>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                name="password"
                placeholder=""
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
                aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                title={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button type="submit" style={{ ...ui.button, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "กำลังสมัคร..." : "Register"}
          </button>
        </form>

        {message && <p style={ui.message}>{message}</p>}

        <p style={ui.helper}>
          go to <Link to="/login" style={ui.link}>Login</Link>
        </p>
      </div>
    </div>
  );
}

/* ===== Styles ===== */
const ui = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    background: colors.bg,
    padding: 24,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
    color: colors.ink,
  },
  logoWrap: { display: "grid", placeItems: "center" },
  logo: { width: 90, height: 90, objectFit: "contain" },
  brandText: {
    marginTop: 6,
    fontWeight: 800,
    letterSpacing: 1,
    fontSize: 14,
    color: "#0b3b2a",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: colors.card,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(2,6,12,0.06)",
    padding: "26px 28px",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    color: "#111827",
  },

  field: { marginTop: 14 },
  label: { display: "block", fontSize: 12, color: colors.ink, marginBottom: 8 },

  // ครอบ input + ปุ่มตาให้อยู่ในกรอบเดียว ไม่ล้ำออกนอก
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    background: colors.input,
    borderRadius: 9999,
    border: "1px solid rgba(0,0,0,0.06)",
  },
  input: {
    flex: 1,
    padding: "10px 44px 10px 16px",
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: 14,
    borderRadius: 9999,
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#374151",
    fontSize: 18,
  },

  button: {
    width: "100%",
    marginTop: 18,
    padding: "12px 16px",
    background: colors.green,
    color: "#fff",
    border: "none",
    borderRadius: 9999,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 16,
    letterSpacing: 0.2,
  },

  message: { marginTop: 12, textAlign: "center", fontSize: 14 },
  helper: { marginTop: 10, textAlign: "center", color: colors.muted, fontSize: 12 },
  link: { color: colors.green, textDecoration: "none", fontWeight: 600 },
};
