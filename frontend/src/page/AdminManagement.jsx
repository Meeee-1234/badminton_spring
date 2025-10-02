
import React, { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

export default function AdminManagement() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth:token");
    if (!token) {
      setMessage("❌ Unauthorized: กรุณา login เป็น admin");
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [userRes, bookingRes] = await Promise.all([
          fetch(`${API}/api/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/admin/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!userRes.ok || !bookingRes.ok) {
          throw new Error("โหลดข้อมูลไม่สำเร็จ");
        }

        const [userData, bookingData] = await Promise.all([
          userRes.json(),
          bookingRes.json(),
        ]);

        setUsers(userData.users || []);
        setBookings(bookingData.bookings || []);
      } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว:", err);
        setMessage("❌ โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Segoe UI, sans-serif",
        background: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        📊 Admin Management
      </h1>

      {/* ✅ แสดงข้อความ error หรือกำลังโหลด */}
      {loading && <p style={{ textAlign: "center" }}>⏳ กำลังโหลด...</p>}
      {message && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 20,
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}

      {/* Users Table */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}
        >
          👤 Users
        </h2>
        <div
          style={{
            overflowX: "auto",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: 12,
                    background: "#10b981",
                    color: "#fff",
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  ID
                </th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>ชื่อ</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Email</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Phone</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>isAdmin</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u._id}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.name}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.email}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      {u.phone || "-"}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      {u.role === "admin" ? "✅" : "❌"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}
                  >
                    ไม่มีข้อมูลผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bookings Table */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}
        >
          📝 Bookings
        </h2>
        <div
          style={{
            overflowX: "auto",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ID", "User", "Date", "Court", "Hour", "Note"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: 12,
                      background: "#10b981",
                      color: "#fff",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.length > 0 ? (
                bookings.map((b) => (
                  <tr key={b._id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b._id}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      {b.user?.name || "-"}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.date}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.court}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      {`${b.hour}:00 - ${b.hour + 1}:00`}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      {b.note || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}
                  >
                    ไม่มีข้อมูลการจอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
