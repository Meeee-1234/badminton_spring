import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";

const API = process.env.REACT_APP_API_URL || "https://badminton-spring-1.onrender.com";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const saveUserNormalized = (rawUser) => {
    const user = {
      _id: rawUser?._id ?? rawUser?.id ?? rawUser?.userId ?? rawUser?.uuid,
      name: rawUser?.name ?? rawUser?.fullName ?? rawUser?.username ?? "",
      email: rawUser?.email ?? "",
      role: rawUser?.role ?? "user",
      ...rawUser,
    };
    if (!user._id) throw new Error("ไม่พบรหัสผู้ใช้ (_id/id)");
    localStorage.setItem("auth:user", JSON.stringify(user));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      if (data.token) localStorage.setItem("auth:token", data.token);

      if (data.user) {
        saveUserNormalized(data.user);
      } else {
        const meRes = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth:token") || ""}` },
        });
        const me = await meRes.json();
        if (!meRes.ok) {
          setError(me.error || "ดึงโปรไฟล์ไม่สำเร็จ");
          return;
        }
        saveUserNormalized(me);
      }

      setMessage("เข้าสู่ระบบสำเร็จ ✅");
      setTimeout(() => navigate("/"), 600);
    } catch (err) {
      console.error("Login failed:", err);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={ui.page}>
      <div style={ui.card}>
        <h1 style={ui.title}>Login</h1>
        <p style={ui.sub}>กรอกข้อมูลเพื่อเข้าใช้งาน</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <div style={ui.field}>
            <label htmlFor="email" style={ui.label}>Email</label>
            <div style={ui.inputWrap}>
              <input id="email" type="email" name="email" style={ui.input}
                     value={form.email} onChange={handleChange} autoComplete="email" required />
            </div>
          </div>

          <div style={ui.field}>
            <label htmlFor="password" style={ui.label}>Password</label>
            <div style={ui.inputWrap}>
              <input id="password" type={showPw ? "text" : "password"} name="password"
                     style={ui.input} value={form.password} onChange={handleChange}
                     autoComplete="current-password" required />
              <button type="button" style={ui.eyeBtn}
                      onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button type="submit" style={ui.button} disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        {error && <p style={{ ...ui.message, color: "red" }}>{error}</p>}
        {message && <p style={{ ...ui.message, color: "green" }}>{message}</p>}

        <p style={ui.helper}>
          ยังไม่มีบัญชี? <Link to="/register" style={ui.link}>สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  );
}

const colors = {
  primary: "#10B981",
  primaryDark: "#059669",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e5e7eb",
  card: "#ffffff",
  bg: "#f8fafc",
};

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
  title: { margin: 0, fontWeight: 800, color: colors.ink, textAlign: "center" },
  sub: { margin: "6px 0 0 0", color: colors.muted, fontSize: 14, textAlign: "center" },
  field: { marginTop: 16 },
  label: { display: "block", fontWeight: 600, marginBottom: 6, textAlign: "left" },
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
  },
  message: { marginTop: 12, textAlign: "center", fontSize: 14 },
  helper: { marginTop: 16, textAlign: "center", color: colors.muted, fontSize: 14 },
  link: { color: colors.primaryDark, fontWeight: 700, textDecoration: "none" },
};