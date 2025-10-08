// src/pages/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8080";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const idOf = (obj) => obj?.id ?? obj?._id ?? obj?.userId ?? null;

  const normalizeUsers = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.users && Array.isArray(data.users)) return data.users;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  };

  useEffect(() => {
    const token = localStorage.getItem("auth:token");
    const user = JSON.parse(localStorage.getItem("auth:user") || "{}");

    if (!token || !String(user.role || "").match(/admin/i)) {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (Admin เท่านั้น)");
      navigate("/");
      return;
    }

    async function fetchUsers() {
      try {
        const res = await fetch(`${API}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await res.text();
        console.log("📌 Raw user response =", text);

        const data = JSON.parse(text);
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
    <div style={{ padding: 20, fontFamily: "Segoe UI, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>👤 Users Management</h1>

      {loading ? (
        <p>⏳ กำลังโหลดข้อมูล...</p>
      ) : users.length > 0 ? (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>#</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>ชื่อ</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Email</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Phone</th>
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <tr key={idOf(u) || index}>
                  <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.name || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.email || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.phone || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.role || "user"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: "#9ca3af" }}>ไม่มีข้อมูลผู้ใช้</p>
      )}
    </div>
  );
}
