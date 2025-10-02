import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://badminton-hzwm.onrender.com";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "", email: "", phone: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [avatar, setAvatar] = useState("");   // ✅ URL ของรูป
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(null);

  // โหลด user + profile
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("auth:user") || "{}");
    if (u?._id) {
      setUserId(u._id);
      setUser({ name: u.name, email: u.email, phone: u.phone });
      setEditForm({ name: u.name, email: u.email, phone: u.phone });

      fetch(`${API}/api/profile/${u._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) setAvatar(data.avatar || "");
        })
        .catch(() => {});
    }
  }, []);

  const handleChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // ✅ upload avatar file
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessage("⏳ กำลังอัพโหลดรูป...");

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch(`${API}/api/profile/${userId}/avatar`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAvatar(data.avatar); // ✅ backend ส่ง URL กลับมา
        setMessage("✅ อัพโหลดรูปสำเร็จ");
      } else {
        setMessage(`❌ ${data.error || "Upload ไม่สำเร็จ"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("❌ Server error");
    }
  };

  // ✅ save user info
  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("⏳ กำลังบันทึก...");

    try {
      const res = await fetch(`${API}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ อัพเดตข้อมูลสำเร็จ");
        setUser({ ...user, name: data.user.name, phone: data.user.phone });
        localStorage.setItem("auth:user", JSON.stringify(data.user));
      } else {
        setMessage(`❌ ${data.error || "อัพเดตไม่สำเร็จ"}`);
      }
    } catch (err) {
      setMessage("❌ Server error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth:token");
    localStorage.removeItem("auth:user");
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* HERO */}
      <section style={{ position: "relative" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#064e3b" }}>
            Your Profile
          </h1>
          <p style={{ color: "#4b5563", marginTop: "10px" }}>
            อัปโหลดรูปโปรไฟล์และแก้ไขข้อมูลบัญชีของคุณ
          </p>

          {/* ✅ Upload avatar */}
          <div style={{ marginTop: "20px" }}>
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  background: "#d1fae5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "800",
                  fontSize: "24px",
                  margin: "auto",
                }}
              >
                {user.name?.[0] || "U"}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ marginTop: "10px" }}
            />
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section
        style={{
          maxWidth: "600px",
          margin: "20px auto",
          padding: "20px",
        }}
      >
        <form
          onSubmit={handleSave}
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#065f46",
              marginBottom: "16px",
            }}
          >
            ข้อมูลบัญชี
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <label>Username</label>
              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
              />
            </div>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={editForm.email}
                readOnly
                style={{ width: "100%", padding: "10px" }}
              />
            </div>
            <div>
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={editForm.phone}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#059669",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
            }}
          >
            Save changes
          </button>
        </form>

        <button
          onClick={handleLogout}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
          }}
        >
          Logout
        </button>

        {message && (
          <p style={{ marginTop: "10px", color: "#374151" }}>{message}</p>
        )}
      </section>
    </div>
  );
}
