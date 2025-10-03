import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://badminton-hzwm.onrender.com";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "", email: "", phone: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [bookings, setBookings] = useState([]);

  const [emergencyForm, setEmergencyForm] = useState({
    emergencyName: "",
    emergencyPhone: "",
  });


 
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("auth:user") || "{}");
    if (u?._id) {
      setUserId(u._id);
      setUser({ name: u.name, email: u.email, phone: u.phone });
      setEditForm({ name: u.name, email: u.email, phone: u.phone });

      fetch(`${API}/api/profile/${u._id}`)
      .then(res => {
        if (!res.ok) throw new Error("ไม่พบข้อมูล");
        return res.json();
      })
      .then(data => {
        setEmergencyForm({
          emergencyName: data.emergencyName || "",
          emergencyPhone: data.emergencyPhone || ""
        });
      })
      .catch(err => console.error("Emergency fetch error:", err));

      fetch(`${API}/api/bookings/user/${u._id}`)
        .then(res => res.json())
        .then(data => {
          setBookings(data.bookings || []);
        })
        .catch(err => console.error("Booking fetch error:", err));
    }
  }, []);

  const handleChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

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

  const handleLogout = () => {
    localStorage.removeItem("auth:token");
    localStorage.removeItem("auth:user");
    navigate("/");
  };

  const handleEmergencyChange = (e) => {
    setEmergencyForm({ ...emergencyForm, [e.target.name]: e.target.value });
  };

  const handleSaveEmergency = async (e) => {
    e.preventDefault();
    setEmergencyMessage("⏳ กำลังบันทึก...");

    try {
      const res = await fetch(`${API}/api/profile/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emergencyForm),
      });

      const data = await res.json();
      if (res.ok) {
        setEmergencyMessage("✅ อัพเดตข้อมูลฉุกเฉินสำเร็จ");
      } else {
        setEmergencyMessage(`❌ ${data.error || "อัพเดตไม่สำเร็จ"}`);
      }
    } catch (err) {
      console.error("Emergency update error:", err);
      setEmergencyMessage("❌ Server error");
    }
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
          }}
        >
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
            จัดการข้อมูลบัญชีของคุณ และอัปเดตเบอร์ติดต่อเพื่อการจองที่รวดเร็วขึ้น
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px 60px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "24px",
          }}
        >
          {/* LEFT CARD */}
          <aside>
            <div
              style={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    height: "56px",
                    width: "56px",
                    borderRadius: "50%",
                    background: "#d1fae5",
                    color: "#065f46",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "18px",
                  }}
                >
                  {user.name?.[0] || "U"}
                </div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>{user.email}</div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "24px",
                  fontSize: "14px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    padding: "12px 0",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Phone</span>
                  <span style={{ fontWeight: "500", color: "#111827" }}>{user.phone}</span>
                </div>
              </div>

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
                  onMouseOver={(e) => (e.target.style.background = "#b91c1c")}
                  onMouseOut={(e) => (e.target.style.background = "#dc2626")}
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT SIDE */}
          <main>
            {/* ฟอร์มแก้ไขข้อมูลทั่วไป */}
            <form
              onSubmit={handleSave}
              style={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#065f46",
                  marginBottom: "16px",
                }}
              >
                แก้ไขข้อมูล
              </h2>

              <div style={{ display: "grid", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", marginBottom: "6px" }}>
                    Username
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "12px",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", marginBottom: "6px" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    readOnly
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "12px",
                      background: "#f9fafb",
                      color: "#6b7280",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", marginBottom: "6px" }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "12px",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "24px",
                }}
              >
                <span style={{ fontSize: "14px" }}>{message}</span>
                <button
                  type="submit"
                  style={{
                    borderRadius: "12px",
                    background: "#059669",
                    color: "white",
                    padding: "12px 20px",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 8px rgba(16,185,129,0.3)",
                  }}
                  onMouseOver={(e) => (e.target.style.background = "#047857")}
                  onMouseOut={(e) => (e.target.style.background = "#059669")}
                >
                  Save changes
                </button>
              </div>
            </form>

            {/* ฟอร์ม Emergency Contact */}
            <form
              onSubmit={handleSaveEmergency}
              style={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "24px",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#dc2626",
                  marginBottom: "16px",
                }}
              >
                Emergency Contact
              </h2>

              <div style={{ display: "grid", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", marginBottom: "6px" }}>
                    ชื่อผู้ติดต่อ
                  </label>
                  <input
                    type="text"
                    name="emergencyName"
                    value={emergencyForm.emergencyName}
                    onChange={handleEmergencyChange}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "12px",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", marginBottom: "6px" }}>
                    เบอร์โทรฉุกเฉิน
                  </label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={emergencyForm.emergencyPhone}
                    onChange={handleEmergencyChange}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "12px",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "24px",
                }}
              >
                <span style={{ fontSize: "14px" }}>{emergencyMessage}</span>
                <button
                  type="submit"
                  style={{
                    borderRadius: "12px",
                    background: "#dc2626",
                    color: "white",
                    padding: "12px 20px",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 8px rgba(220,38,38,0.3)",
                  }}
                  onMouseOver={(e) => (e.target.style.background = "#b91c1c")}
                  onMouseOut={(e) => (e.target.style.background = "#dc2626")}
                >
                  Save Emergency
                </button>
              </div>
            </form>
          </main>
        </div>
      </section>

      {/* Booking History */}
      <section
        style={{
          marginTop: "32px",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          background: "white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#1d4ed8",
            marginBottom: "16px",
          }}
        >
          ประวัติการจองสนาม
        </h2>

        {bookings.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            คุณยังไม่มีประวัติการจอง
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb" }}>วันที่</th>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb" }}>คอร์ต</th>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb" }}>เวลา</th>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb" }}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                    {b.date}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                    คอร์ต {b.court}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                    {b.hour}:00 - {b.hour + 1}:00
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                    {b.status === "booked" && "📌 จองแล้ว"}
                    {b.status === "arrived" && "✅ มาแล้ว"}
                    {b.status === "canceled" && "❌ ยกเลิก"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
