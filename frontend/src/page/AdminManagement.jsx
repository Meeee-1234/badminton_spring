
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-spring-1.onrender.com";

export default function AdminManagement() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchDate, setSearchDate] = useState("");
  

  const isAdmin = (role) => !!String(role || "").match(/admin/i);
  const idOf = (obj) => obj?.id ?? obj?._id ?? obj?.userId ?? null;

  const normalizeUsers = (data) => (Array.isArray(data) ? data : []);
  const normalizeBookings = (data) => {
    const list = Array.isArray(data) ? data : data?.bookings ?? data?.data ?? [];
    return Array.isArray(list) ? list : [];
  };

  const safeJson = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Response is not JSON: ${text.slice(0, 200)}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth:token");
    localStorage.removeItem("auth:user");
    navigate("/login");
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?")) return;

    const token = localStorage.getItem("auth:token");
    if (!token) {
      alert("ไม่มี token");
      return;
    }

    const uid = encodeURIComponent(id);
    try {
      const res = await fetch(`${API}/api/admin/users/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "ลบผู้ใช้ไม่สำเร็จ");

      setUsers((prev) => prev.filter((u) => idOf(u) !== id));
      alert(data.message || "ลบสำเร็จ");
    } catch (err) {
      console.error("Delete user error:", err);
      alert("ผิดพลาด: " + err.message);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("auth:token");
    const user = JSON.parse(localStorage.getItem("auth:user") || "{}");

    if (!token || !isAdmin(user.role)) {
      alert("คุณไม่มีสิทธิ์การเข้าถึงหน้านี้ (Admin เท่านั้น)");
      navigate("/");
      return;
    }

    async function fetchUsers() {
      try {
        const res = await fetch(`${API}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(normalizeUsers(data));
      } catch (err) {
        console.error("❌ Users error:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [navigate]);





  return (
    <div style={{ padding: 20, fontFamily: "Segoe UI, sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => navigate("/")} style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid #d1d5db", background: "#fff", color: "#0f172a", fontWeight: 600 }}>
          ← กลับหน้าแรก
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800 }}>📊 Admin Management</h1>
        <button onClick={handleLogout} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
          🚪 Logout
        </button>
      </div>

      {message && (
        <div style={{ background: "#fef3c7", color: "#92400e", padding: "10px 14px", borderRadius: 8, marginTop: 16 }}>
          {message}
        </div>
      )}

      {/* Users */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>👤 Users</h2>
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
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
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                    กำลังโหลด...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u, index) => {
                  const uid = idOf(u);
                  return (
                    <tr key={uid || index}>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                        {u.name || "-"}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                        {u.email || "-"}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                        {u.phone || "-"}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                        <button
                          onClick={() => handleDeleteUser(uid)}
                          disabled={!uid}
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontWeight: 600,
                            cursor: "pointer",
                            opacity: uid ? 1 : 0.5,
                          }}
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {/* Bookings */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>📝 Bookings</h2>


        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ID", "User", "Date", "Court", "Hour", "Status"].map((h) => (
                  <th key={h} style={{ padding: 12, background: "#10b981", color: "#fff", textAlign: "center", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 16 }}>กำลังโหลด...</td></tr>
              ) : bookings.length > 0 ? (
                  bookings.map((b, index) => (
                  <tr key={b._id || `${b.date}-${b.court}-${b.hour}-${index}`}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{index + 1}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.user?.name || b.userName || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.date}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.court}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{`${b.hour}:00 - ${b.hour + 1}:00`}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", padding: "4px 10px", borderRadius: 12, fontWeight: 600, textAlign: "center", minWidth: 60,
                        backgroundColor:
                          b.status === "booked" ? "#bfdbfe" :
                          b.status === "arrived" ? "#bbf7d0" :
                          b.status === "canceled" ? "#fecaca" : "#e5e7eb",
                        color:
                          b.status === "booked" ? "#1e3a8a" :
                          b.status === "arrived" ? "#065f46" :
                          b.status === "canceled" ? "#7f1d1d" : "#374151",
                      }}>
                        {b.status === "booked" && "จองแล้ว"}
                        {b.status === "arrived" && "มาแล้ว"}
                        {b.status === "canceled" && "ยกเลิก"}
                        {!b.status && "-"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}>ไม่มีข้อมูลการจอง</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
