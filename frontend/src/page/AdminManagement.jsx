
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-spring-1.onrender.com";

export default function AdminManagement() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); 
  
  const handleLogout = () => {
    localStorage.removeItem("auth:token");
    localStorage.removeItem("auth:user");
    navigate("/login");
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?")) return;

    const token = localStorage.getItem("auth:token");
    try {
      const res = await fetch(`${API}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      console.log("Raw response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Response is not JSON: " + text.substring(0, 100));
      }

      if (!res.ok) throw new Error(data.error || "ลบผู้ใช้ไม่สำเร็จ");

      setUsers((prev) => prev.filter((u) => u._id !== id));
      alert(" " + data.message);
    } catch (err) {
      console.error("Delete user error:", err);
      alert(" " + err.message);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("auth:token");
    const user = JSON.parse(localStorage.getItem("auth:user") || "{}");

    if (!token || user.role !== "admin") {
      alert("คุณไม่มีสิทธิ์การเข้าถึงหน้านี้ (Admin เท่านั้น)");
      navigate("/"); 
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

        const filteredUsers = (userData.users || []).filter((u) => u.role !== "admin");
        setUsers(filteredUsers);
        setBookings(bookingData.bookings || []);
      } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว:", err);
        setMessage("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  if (loading) return <p>⏳ กำลังโหลด...</p>;

  const filteredBookings = bookings.filter((b) => {
    const keyword = searchTerm.toLowerCase();
    return (
      (b.user?.name || "").toLowerCase().includes(keyword) ||
      (b.date || "").toLowerCase().includes(keyword) ||
      (b.court || "").toString().includes(keyword) ||
      (b.status || "").toLowerCase().includes(keyword)
    );
  });

  return (
    <div style={{ padding: 20, fontFamily: "Segoe UI, sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => navigate("/")} style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid #d1d5db", background: "#fff", color: "#0f172a", fontWeight: 600 }}> ← กลับหน้าแรก </button>
 
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>📊 Admin Management</h1>
        <button onClick={handleLogout} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>🚪 Logout</button>
      </div>

      {/* Flash Message */}
      {message && (
        <div style={{ background: "#fef3c7", color: "#92400e", padding: "10px 14px", borderRadius: 8, marginTop: 16 }}> {message}</div>
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
              {users.length > 0 ? (
                users.map((u, index) => (
                  <tr key={u._id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.name}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.email}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.phone || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                      <button onClick={() => handleDeleteUser(u._id)} 
                       style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>🗑 Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}> ไม่มีข้อมูลผู้ใช้ </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bookings */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>📝 Bookings</h2>

        {/* Search */}
        <input type="text" placeholder="🔍 ค้นหา Booking (ชื่อ, คอร์ท, สถานะ)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          style={{marginBottom: 12,padding: "8px 12px", width: "100%", maxWidth: 350, border: "1px solid #d1d5db", borderRadius: 8, }}/>

        {/* Search by Date */}
        <input type="date" onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db",borderRadius: 8, }}/>
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ID", "User", "Date", "Court", "Hour", "Status"].map((h) => (
                <th key={h} style={{ padding: 12, background: "#10b981", color: "#fff", textAlign: "center", fontWeight: 600 }}>{h}</th> ))}
              </tr>
            </thead>
            <tbody>
                {filteredBookings.length > 0 ? (
                filteredBookings.map((b, index) => (
                  <tr key={b._id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{index + 1}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.user?.name || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.date}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.court}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{`${b.hour}:00 - ${b.hour + 1}:00`}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 12, fontWeight: 600, textAlign: "center", minWidth: 60,
                      backgroundColor:
                      b.status === "booked" ? "#bfdbfe" : 
                      b.status === "arrived" ? "#bbf7d0" : 
                      b.status === "canceled" ? "#fecaca" :
                        "#e5e7eb", 
                      color:
                      b.status === "booked" ? "#1e3a8a" :
                      b.status === "arrived" ? "#065f46" :
                      b.status === "canceled" ? "#7f1d1d" :
                        "#374151",
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
