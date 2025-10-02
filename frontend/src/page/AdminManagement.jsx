import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-mongo.vercel.app";

export default function AdminManagement() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("auth:token");
    localStorage.removeItem("auth:user");
    navigate("/login");
  };

  // ✅ Delete User
const handleDeleteUser = async (id) => {
  if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?")) return;

  const token = localStorage.getItem("auth:token");
  try {
    const res = await fetch(`${API}/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();   // ✅ อ่านข้อความจาก backend
    if (!res.ok) throw new Error(data.error || "ลบผู้ใช้ไม่สำเร็จ");

    setUsers(users.filter((u) => u._id !== id));
    alert("✅ " + data.message);
  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  }
};

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

        if (!userRes.ok || !bookingRes.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");

        const [userData, bookingData] = await Promise.all([
          userRes.json(),
          bookingRes.json(),
        ]);

        // filter user ที่ไม่ใช่ admin
        const filteredUsers = (userData.users || []).filter((u) => u.role !== "admin");

        setUsers(filteredUsers);
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
      {/* Header + Logout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center" }}>
          📊 Admin Management
        </h1>
        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Users Table */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>👤 Users</h2>
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
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>#</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>ชื่อ</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Email</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Phone</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((u, index) => (
                  <tr key={u._id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.name}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.email}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.phone || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      <button
                        onClick={() => handleDeleteUser(u._id)}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}>
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
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>📝 Bookings</h2>
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
                {["#", "User", "Date", "Court", "Hour", "Note"].map((h) => (
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
                bookings.map((b, index) => (
                  <tr key={b._id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.user?.name || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.date}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.court}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      {`${b.hour}:00 - ${b.hour + 1}:00`}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{b.note || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}>
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
 