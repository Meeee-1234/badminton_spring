import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://badminton-spring-1.onrender.com";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState({ name: "", email: "", phone: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencyForm, setEmergencyForm] = useState({
    emergencyName: "",
    emergencyPhone: "",
  });

  // ---------- helpers ----------
  const getLocalUser = () => {
    try {
      return JSON.parse(localStorage.getItem("auth:user") || "{}");
    } catch {
      return {};
    }
  };

  const getId = (u) => u?._id ?? u?.id ?? u?.userId ?? u?.uuid ?? null;
  const getToken = () => localStorage.getItem("auth:token") || "";

  const authFetch = async (url, init = {}) => {
    const token = getToken();
    const headers = {
      ...(init.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...init, headers });
  };

  const tryFetchJson = async (url, withAuth = false) => {
    try {
      const res = withAuth ? await authFetch(url, { cache: "no-store" }) : await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // ---------- init: read user from localStorage ----------
  useEffect(() => {
    const u = getLocalUser();
    console.log("📦 Local user:", u);
    const uid = getId(u);

    if (!uid) {
      // ถ้าไม่มี user ให้กลับไปล็อกอิน
      navigate("/login");
      return;
    }

    setUserId(uid);
    setUser({ name: u.name || "", email: u.email || "", phone: u.phone || "" });
    setEditForm({ name: u.name || "", email: u.email || "", phone: u.phone || "" });

    // โหลด emergency profile (แนวโน้มต้องการ auth)
    authFetch(`${API}/api/profile/${uid}`)
      .then((res) => {
        if (!res.ok) throw new Error("เกิดข้อผิดพลาด");
        return res.json();
      })
      .then((data) => {
        console.log("✅ Emergency profile data:", data);
        setEmergencyForm({
          emergencyName: data.emergencyName || "",
          emergencyPhone: data.emergencyPhone || "",
        });
      })
      .catch((err) => {
        console.error("❌ Emergency profile fetch error:", err);
        setEmergencyMessage("โหลดข้อมูลล้มเหลว");
      });
  }, [navigate]);

  // ---------- booking history ----------
  const toDateKey = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const addDays = (d, delta) => {
    const x = new Date(d);
    x.setDate(x.getDate() + delta);
    return x;
  };

  const loadBookingHistory = async (uid) => {
    if (!uid) return;

    // ลอง endpoint ทั่วไปก่อน
    const candidates = [
      `${API}/api/bookings/user/${uid}`,
      `${API}/api/bookings/history/${uid}`,
      `${API}/api/bookings?userId=${encodeURIComponent(uid)}`,
    ];

    for (const url of candidates) {
      const data = await tryFetchJson(url); // booking มักไม่ต้อง auth
      const list = Array.isArray(data) ? data : data?.bookings;
      if (Array.isArray(list)) {
        const norm = list
          .map((b) => ({
            _id: b._id || b.id || `${b.date}-${b.court}-${b.hour}`,
            date: b.date,
            court: b.court,
            hour: b.hour,
            status: b.status,
          }))
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.hour - b.hour));

        setBookings(norm);
        return;
      }
    }

    // fallback: ไล่ย้อน 30 วัน ด้วย /api/bookings/my/{uid}/{dateKey}
    const today = new Date();
    const days = 30;
    const results = [];

    for (let i = 0; i < days; i++) {
      const dkey = toDateKey(addDays(today, -i));
      const url = `${API}/api/bookings/my/${encodeURIComponent(uid)}/${encodeURIComponent(dkey)}`;
      const data = await tryFetchJson(url);

      if (data?.mine && Array.isArray(data.mine)) {
        data.mine.forEach((ch) => {
          const [c, h] = ch.split(":").map(Number);
          results.push({
            _id: `${dkey}-${c}-${h}`,
            date: dkey,
            court: c,
            hour: h,
            status: "booked",
          });
        });
      } else if (Array.isArray(data?.items)) {
        data.items.forEach((b) =>
          results.push({
            _id: b._id || `${b.date}-${b.court}-${b.hour}`,
            date: b.date || dkey,
            court: b.court,
            hour: b.hour,
            status: b.status || "booked",
          })
        );
      }
    }

    results.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.hour - b.hour));
    setBookings(results);
  };

  useEffect(() => {
    if (userId) loadBookingHistory(userId);
  }, [userId]);

  // sync realtime
  useEffect(() => {
    let bc;
    const onStorage = (e) => {
      if (e.key === "booking:updated") {
        try {
          const payload = JSON.parse(e.newValue || "{}");
          if (!payload) return;
          // ถ้า payload มี userId ให้เช็คด้วย ถ้าไม่มีให้รีโหลดไว้ก่อน
          if (!payload.userId || payload.userId === userId) {
            loadBookingHistory(userId);
          }
        } catch {}
      }
    };

    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("booking-events");
        bc.onmessage = (ev) => {
          if (ev?.data?.type === "booking-updated") {
            if (!ev.data.userId || ev.data.userId === userId) {
              loadBookingHistory(userId);
            }
          }
        };
      } else {
        window.addEventListener("storage", onStorage);
      }
    } catch {}

    return () => {
      try {
        if (bc) bc.close();
        else window.removeEventListener("storage", onStorage);
      } catch {}
    };
  }, [userId]);

  // ---------- form handlers ----------
  const handleChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("⏳ กำลังบันทึก...");

    try {
      const u = getLocalUser();
      const id = getId(u);

      if (!id) {
        setMessage("❌ ไม่พบ ID ผู้ใช้งาน");
        return;
      }

      const res = await authFetch(`${API}/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
        }),
      });

      const data = await res.json();
      console.log("PATCH response:", data);

      if (res.ok) {
        setMessage("✅ อัปเดตข้อมูลสำเร็จ");
        const updated = data.user || data;
        const updatedUser = {
          ...u,
          name: updated.name,
          phone: updated.phone,
        };
        setUser(updatedUser);
        localStorage.setItem("auth:user", JSON.stringify(updatedUser));
      } else {
        setMessage(`❌ ${data.error || "อัปเดตไม่สำเร็จ"}`);
      }
    } catch (err) {
      console.error("❌ Update error:", err);
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
      if (!userId) {
        setEmergencyMessage("❌ ไม่พบ ID ผู้ใช้");
        return;
      }

      const res = await authFetch(`${API}/api/profile/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emergencyForm),
      });

      const data = await res.json();
      if (res.ok) {
        setEmergencyMessage("✅ อัพเดตข้อมูลฉุกเฉินสำเร็จ");
      } else {
        setEmergencyMessage(`${data.error || "อัพเดตไม่สำเร็จ"}`);
      }
    } catch (err) {
      console.error("Emergency update error:", err);
      setEmergencyMessage("Server error");
    }
  };

  // ---------- render ----------
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
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
                fontSize: "18px",
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
            style={{ fontSize: "3rem", fontWeight: "800", color: "#064e3b", textAlign: "center" }}
          >
            Your Profile
          </h1>
          <p
            style={{
              fontSize: "20px",
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

      <section style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
          <aside>
            <div
              style={{
                borderRadius: "16px",
                border: "1px solid #6ee7b7",
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
                    fontSize: "30px",
                  }}
                >
                  {user.name?.[0] || "U"}
                </div>

                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "30px", fontWeight: "700", color: "#111827" }}>
                    {user.name}
                  </div>

                  <div style={{ fontSize: "18px", color: "#6b7280" }}>{user.email}</div>
                </div>
              </div>

              <div style={{ marginTop: "24px", fontSize: "14px", borderTop: "1px solid #e5e7eb" }}>
                <div style={{ padding: "12px 0", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280", fontSize: "20px" }}>Phone</span>
                  <span style={{ fontWeight: "500", color: "#111827", fontSize: "20px" }}>
                    {user.phone}
                  </span>
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
                    fontSize: "15px",
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

          <main>
            <form
              onSubmit={handleSave}
              style={{
                borderRadius: "16px",
                border: "1px solid #6ee7b7",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "30px",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "30px",
                  fontWeight: "700",
                  color: "#065f46",
                  marginBottom: "16px",
                }}
              >
                Edit Information
              </h2>
              <br />

              <div style={{ display: "grid", gap: "20px", paddingRight: "20px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "20px",
                      fontWeight: "bold",
                      marginBottom: "6px",
                      textAlign: "left",
                    }}
                  >
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
                      border: "1px solid #6ee7b7",
                      padding: "10px",
                      outline: "none",
                      fontSize: "16px",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "20px",
                      fontWeight: "bold",
                      marginBottom: "6px",
                      textAlign: "left",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    readOnly
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      padding: "10px",
                      outline: "none",
                      fontSize: "16px",
                      backgroundColor: "#f9fafb",
                      color: "#6b7280",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "20px",
                      fontWeight: "bold",
                      marginBottom: "6px",
                      textAlign: "left",
                    }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, "");
                      if (onlyNums.length <= 10) {
                        setEditForm({ ...editForm, phone: onlyNums });
                      }
                    }}
                    maxLength={10}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #6ee7b7",
                      padding: "10px",
                      outline: "none",
                      fontSize: "16px",
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
                <span style={{ fontSize: "20px" }}>{message}</span>
                <button
                  type="submit"
                  style={{
                    borderRadius: "12px",
                    background: "#059669",
                    color: "white",
                    padding: "12px 20px",
                    fontSize: "16px",
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

            <form
              onSubmit={handleSaveEmergency}
              style={{
                borderRadius: "16px",
                border: "1px solid #6ee7b7",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "30px",
              }}
            >
              <h2
                style={{
                  fontSize: "30px",
                  fontWeight: "700",
                  color: "#dc2626",
                  marginBottom: "16px",
                }}
              >
                Emergency Contact
              </h2>
              <br />

              <div style={{ display: "grid", gap: "20px", paddingRight: "20px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "20px",
                      marginBottom: "6px",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    name="emergencyName"
                    value={emergencyForm.emergencyName}
                    onChange={handleEmergencyChange}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #6ee7b7",
                      padding: "10px",
                      outline: "none",
                      fontSize: "16px",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "20px",
                      marginBottom: "6px",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={emergencyForm.emergencyPhone}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, "");
                      if (onlyNums.length <= 10) {
                        setEmergencyForm({ ...emergencyForm, emergencyPhone: onlyNums });
                      }
                    }}
                    maxLength={10}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #6ee7b7",
                      padding: "10px",
                      outline: "none",
                      fontSize: "16px",
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
                <span style={{ fontSize: "20px" }}>{emergencyMessage}</span>
                <button
                  type="submit"
                  style={{
                    borderRadius: "12px",
                    background: "#dc2626",
                    color: "white",
                    padding: "12px 20px",
                    fontWeight: "600",
                    fontSize: "16px",
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
          maxWidth: "1150px",
          margin: "0 auto",
          borderRadius: "16px",
          border: "1px solid #6ee7b7",
          background: "white", // ✅ ลบตัวอักษรแปลกหน้า property
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          padding: "24px",
          marginTop: "24px",
        }}
      >
        <h2 style={{ fontSize: "30px", fontWeight: "700", color: "#065f46", marginBottom: "16px" }}>
          ประวัติการจองสนาม
        </h2>
        <br />

        {bookings.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>คุณยังไม่มีประวัติการจอง</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: "12px", overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "#065f46" }}>
                  <th style={{ padding: "12px", color: "white", fontWeight: "600", textAlign: "center" }}>วันที่</th>
                  <th style={{ padding: "12px", color: "white", fontWeight: "600", textAlign: "center" }}>คอร์ต</th>
                  <th style={{ padding: "12px", color: "white", fontWeight: "600", textAlign: "center" }}>เวลา</th>
                  <th style={{ padding: "12px", color: "white", fontWeight: "600", textAlign: "center" }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, index) => (
                  <tr
                    key={b._id}
                    style={{
                      background: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                      transition: "background 0.2s",
                    }}
                  >
                    <td style={{ padding: "10px", border: "1px solid #e5e7eb", textAlign: "center", color: "#111827" }}>
                      {b.date}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #e5e7eb", textAlign: "center", color: "#111827" }}>
                      คอร์ต {b.court}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #e5e7eb", textAlign: "center", color: "#111827" }}>
                      {b.hour}:00 - {b.hour + 1}:00
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 12,
                          fontWeight: 600,
                          textAlign: "center",
                          minWidth: 60,
                          backgroundColor:
                            b.status === "booked"
                              ? "#bfdbfe"
                              : b.status === "arrived"
                              ? "#bbf7d0"
                              : b.status === "canceled"
                              ? "#fecaca"
                              : "#e5e7eb",
                          color:
                            b.status === "booked"
                              ? "#1e3a8a"
                              : b.status === "arrived"
                              ? "#065f46"
                              : b.status === "canceled"
                              ? "#7f1d1d"
                              : "#374151",
                        }}
                      >
                        {b.status === "booked" && "จองแล้ว"}
                        {b.status === "arrived" && "มาแล้ว"}
                        {b.status === "canceled" && "ยกเลิก"}
                        {!b.status && "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <br />
            <br />
          </div>
        )}
      </section>

      <br />
      <br />
      <br />
    </div>
  );
}
