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
  const [showDeleted, setShowDeleted] = useState(false); // ✅ toggle แสดงผู้ใช้ที่ถูกลบแบบ soft

  const isAdmin = (role) => !!String(role || "").match(/admin/i);
  const idOf = (obj) => obj?.id ?? obj?._id ?? obj?.userId ?? null;

  // ฟังก์ชันช่วยตรวจสถานะลบ (รองรับหลายชื่อฟิลด์)
  const isDeleted = (u) => u?.deleted === true || u?.del === true || u?.isDeleted === true;

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

  // ✅ Soft Delete: ตั้งธง deleted = true (หรือ del = true)
  const handleSoftDeleteUser = async (id) => {
    if (!window.confirm("ยืนยันลบแบบ Soft delete (ตั้งค่า deleted=true)?")) return;

    const token = localStorage.getItem("auth:token");
    if (!token) {
      alert("ไม่มี token");
      return;
    }

    const uid = encodeURIComponent(id);
    try {
      const res = await fetch(`${API}/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // พยายามให้ backend รองรับหลายคีย์ ชื่อใดชื่อหนึ่งก็ได้
        body: JSON.stringify({ deleted: true, del: true, isDeleted: true }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Soft delete ไม่สำเร็จ");

      // อัปเดตสถานะใน state
      setUsers((prev) =>
        prev.map((u) => (idOf(u) === id ? { ...u, deleted: true, del: true, isDeleted: true } : u))
      );
      alert(data.message || "ตั้งค่า deleted=true สำเร็จ");
    } catch (err) {
      console.error("Soft delete user error:", err);
      alert("ผิดพลาด: " + err.message);
    }
  };

  // ✅ Restore: ตั้งธง deleted = false
  const handleRestoreUser = async (id) => {
    const token = localStorage.getItem("auth:token");
    if (!token) {
      alert("ไม่มี token");
      return;
    }
    const uid = encodeURIComponent(id);
    try {
      const res = await fetch(`${API}/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deleted: false, del: false, isDeleted: false }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Restore ไม่สำเร็จ");

      setUsers((prev) =>
        prev.map((u) =>
          idOf(u) === id ? { ...u, deleted: false, del: false, isDeleted: false } : u
        )
      );
      alert(data.message || "กู้คืนผู้ใช้สำเร็จ");
    } catch (err) {
      console.error("Restore user error:", err);
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
      }
    }

    async function fetchBookings() {
      try {
        const res = await fetch(`${API}/api/admin/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setBookings(normalizeBookings(data));
      } catch (err) {
        console.error("❌ Bookings error:", err);
        setBookings([]);
      }
    }

    Promise.all([fetchUsers(), fetchBookings()]).finally(() => setLoading(false));
  }, [navigate]);

  // ====== Filter/ค้นหา ======
  const filteredUsers = useMemo(() => {
    let list = Array.isArray(users) ? users : [];
    if (!showDeleted) {
      list = list.filter((u) => !isDeleted(u)); // ซ่อนผู้ใช้ที่ถูก soft delete ถ้าไม่ติ๊กโชว์
    }
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      list = list.filter(
        (u) =>
          String(u.name || "").toLowerCase().includes(q) ||
          String(u.email || "").toLowerCase().includes(q) ||
          String(u.phone || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, showDeleted, searchKeyword]);

  return (
    <div style={{ padding: 20, fontFamily: "Segoe UI, sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/")}
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
            marginBottom: "12px",
          }}
        >
          ← กลับหน้าแรก
        </button>

        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>📊 Admin Management 📊</h1>

        <button
          onClick={handleLogout}
          style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      {message && (
        <div style={{ background: "#fef3c7", color: "#92400e", padding: "10px 14px", borderRadius: 8, marginTop: 16 }}>
          {message}
        </div>
      )}

      {/* ===== Users ===== */}
      <section style={{ marginTop: 20, marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>👤 Users</h2>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#374151" }}>
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            แสดงผู้ใช้ที่ถูกลบ (soft)
          </label>
          <input
            placeholder="ค้นหาชื่อ / อีเมล / เบอร์"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              minWidth: 240,
              outline: "none",
            }}
          />
        </div>

        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}></th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>ชื่อ</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Email</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Phone</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>สถานะ</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                    กำลังโหลด...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u, index) => {
                  const uid = idOf(u);
                  const deleted = isDeleted(u);
                  return (
                    <tr key={uid || index} style={{ background: deleted ? "#fff7ed" : "transparent" }}>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.name || "-"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.email || "-"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.phone || "-"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontWeight: 700,
                            color: deleted ? "#7c2d12" : "#065f46",
                            background: deleted ? "#fed7aa" : "#bbf7d0",
                          }}
                        >
                          {deleted ? "Deleted" : "Active"}
                        </span>
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8, justifyContent: "center" }}>
                        <button
                          onClick={() => handleSoftDeleteUser(uid)}
                          disabled={!uid || deleted}
                          title={deleted ? "ถูกลบแล้ว" : "Soft delete"}
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontWeight: 600,
                            cursor: deleted ? "not-allowed" : "pointer",
                            opacity: uid && !deleted ? 1 : 0.5,
                          }}
                        >
                          Soft Delete
                        </button>
                        <button
                          onClick={() => handleRestoreUser(uid)}
                          disabled={!uid || !deleted}
                          title="Restore"
                          style={{
                            background: "#10b981",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontWeight: 600,
                            cursor: !deleted ? "not-allowed" : "pointer",
                            opacity: uid && deleted ? 1 : 0.5,
                          }}
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 10 }}>
                    ไม่มีข้อมูลผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Bookings ===== */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>📝 Bookings</h2>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />
        </div>

        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["", "User", "Date", "Court", "Hour", "Status"].map((h) => (
                  <th key={h} style={{ padding: 12, background: "#10b981", color: "#fff", textAlign: "center", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                    กำลังโหลด...
                  </td>
                </tr>
              ) : bookings.length > 0 ? (
                bookings
                  .filter((b) => (searchDate ? b.date === searchDate : true))
                  .map((b, index) => (
                    <tr key={b._id || `${b.date}-${b.court}-${b.hour}-${index}`}>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{index + 1}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.user?.name || b.userName || "-"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.date}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{b.court}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{`${b.hour}:00 - ${b.hour + 1}:00`}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontWeight: 600,
                            textAlign: "center",
                            minWidth: 60,
                            backgroundColor:
                              b.status === "booked" ? "#bfdbfe" :
                              b.status === "arrived" ? "#bbf7d0" :
                              b.status === "canceled" ? "#fecaca" : "#e5e7eb",
                            color:
                              b.status === "booked" ? "#1e3a8a" :
                              b.status === "arrived" ? "#065f46" :
                              b.status === "canceled" ? "#7f1d1d" : "#374151",
                          }}
                        >
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
