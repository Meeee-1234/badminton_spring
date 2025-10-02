import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://badminton-hzwm.onrender.com";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "", email: "", phone: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [avatar, setAvatar] = useState("");   // ✅ รูปโปรไฟล์
  const [bio, setBio] = useState("");         // ✅ bio
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(null);

  // โหลด user + profile
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("auth:user") || "{}");
    if (u?._id) {
      setUserId(u._id);
      setUser({ name: u.name, email: u.email, phone: u.phone });
      setEditForm({ name: u.name, email: u.email, phone: u.phone });

      // โหลด profile เพิ่มเติม
      fetch(`${API}/api/profile/${u._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setAvatar(data.avatar || "");
            setBio(data.bio || "");
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
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
      console.error("Update error:", err);
      setMessage("❌ Server error");
    }
  };

  // ✅ save profile info (avatar + bio)
  const handleProfileSave = async () => {
    setMessage("⏳ กำลังบันทึกโปรไฟล์...");
    try {
      const res = await fetch(`${API}/api/profile/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar, bio }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ บันทึกโปรไฟล์แล้ว");
      } else {
        setMessage(`❌ ${data.error || "บันทึกไม่สำเร็จ"}`);
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
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "left" }}>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "12px",
                border: "1px solid #6ee7b7",
                background: "#ecfdf5",
                padding: "8px 16px",
                color: "#065f46",
                fontWeight: "600",
                textDecoration: "none",
                marginBottom: "20px",
              }}
            >
              ← กลับหน้าแรก
            </a>
          </div>

          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: "800",
              color: "#064e3b",
              textAlign: "center",
            }}
          >
            Your Profile
          </h1>
          <p
            style={{
              color: "#4b5563",
              marginTop: "10px",
              maxWidth: "700px",
              textAlign: "center",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            จัดการข้อมูลบัญชีของคุณ เพิ่มรูปโปรไฟล์ และอัปเดตเบอร์ติดต่อเพื่อการจองที่รวดเร็วขึ้น
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
          {/* LEFT CARD */}
          <aside>
            <div
              style={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div>
                {avatar ? (
                  <img
                    src={avatar}
                    alt="avatar"
                    style={{ width: "80px", height: "80px", borderRadius: "50%", margin: "auto" }}
                  />
                ) : (
                  <div
                    style={{
                      height: "80px",
                      width: "80px",
                      borderRadius: "50%",
                      background: "#d1fae5",
                      color: "#065f46",
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
              </div>
              <div style={{ marginTop: "12px", fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                {user.name}
              </div>
              <div style={{ fontSize: "14px", color: "#6b7280" }}>{user.email}</div>
              <div style={{ marginTop: "12px", fontSize: "14px", color: "#374151" }}>{bio}</div>

              <div style={{ marginTop: "24px" }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    borderRadius: "12px",
                    background: "#dc2626",
                    color: "white",
                    padding: "12px",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 8px rgba(220,38,38,0.3)",
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT FORM */}
          <main>
            <form
              onSubmit={handleSave}
              style={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "24px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#065f46", marginBottom: "16px" }}>
                แก้ไขข้อมูลบัญชี
              </h2>

              <div style={{ display: "grid", gap: "20px" }}>
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
                  <input type="email" value={editForm.email} readOnly style={{ width: "100%", padding: "10px" }} />
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

              <button type="submit" style={{ marginTop: "20px", padding: "10px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: "8px" }}>
                Save changes
              </button>
            </form>

            {/* ✅ Profile form */}
            <div
              style={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "24px",
                marginTop: "20px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#065f46", marginBottom: "16px" }}>
                โปรไฟล์เพิ่มเติม
              </h2>

              <div style={{ marginBottom: "12px" }}>
                <label>Profile Image URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="เช่น https://..."
                  style={{ width: "100%", padding: "10px", marginTop: "6px" }}
                />
                {avatar && <img src={avatar} alt="preview" style={{ marginTop: "10px", width: "100px", borderRadius: "50%" }} />}
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "10px", marginTop: "6px" }}
                />
              </div>

              <button type="button" onClick={handleProfileSave} style={{ padding: "10px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px" }}>
                Save Profile
              </button>
            </div>

            {message && <p style={{ marginTop: "10px", color: "#374151" }}>{message}</p>}
          </main>
        </div>
      </section>
    </div>
  );
}
