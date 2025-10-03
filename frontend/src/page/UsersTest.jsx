// src/page/UsersTest.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

const ENDPOINTS = {
  users: (q = "", page = 1, limit = 20) =>
    `${API}/api/admin/users?search=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
};

export default function UsersTest() {
  const navigate = useNavigate();

  // auth / ui
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // query state
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const logout = () => {
    localStorage.removeItem("auth:token");
    localStorage.removeItem("auth:user");
    navigate("/login");
  };

  // ตรวจสิทธิ์ก่อน
  useEffect(() => {
    const token = localStorage.getItem("auth:token");
    const user = JSON.parse(localStorage.getItem("auth:user") || "{}");

    if (!token || user.role !== "admin") {
      setAuthorized(false);
      setMessage("❌ คุณไม่มีสิทธิ์การเข้าถึงหน้านี้ (Admin เท่านั้น)");
      setLoading(false);
      return;
    }
    setAuthorized(true);
  }, []);

  // โหลด users
  const fetchUsers = async () => {
    setLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem("auth:token");
      const res = await fetch(ENDPOINTS.users(q, page, limit), {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        // ถ้าแบ็กเอนด์ใช้คุกกี้ session ให้ใส่:
        // credentials: "include",
      });

      // กันเคสตอบไม่เป็น JSON
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(`[${res.status}] ${data?.error || text || "โหลดข้อมูลล้มเหลว"}`);
      }

      // รองรับ 2 ฟอร์แมต: {users:[], total:n} หรือ {items:[], total:n} หรือ [] ธรรมดา
      const list =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
          ? data.users
          : Array.isArray(data?.items)
          ? data.items
          : [];

      const count =
        typeof data?.total === "number"
          ? data.total
          : typeof data?.count === "number"
          ? data.count
          : list.length;

      setRows(list);
      setTotal(count);
    } catch (err) {
      console.error("fetchUsers error:", err);
      setRows([]);
      setTotal(0);
      setMessage(`❌ โหลดข้อมูลไม่สำเร็จ: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, q, page]);

  if (loading && !authorized) return <p style={{ padding: 20 }}>⏳ กำลังโหลด...</p>;

  // ไม่ใช่แอดมิน
  if (!authorized) {
    return (
      <div style={{ padding: 20, fontFamily: "Segoe UI, sans-serif", background: "#fef2f2", minHeight: "100vh" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#b91c1c" }}>
          {message || "❌ คุณไม่มีสิทธิ์การเข้าถึงหน้านี้"}
        </h1>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: 20,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ef4444",
            background: "#fff",
            color: "#b91c1c",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← กลับหน้าแรก
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Segoe UI, sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/")}
          style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid #d1d5db", background: "#fff", color: "#0f172a", fontWeight: 600 }}
        >
          ← กลับหน้าแรก
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>👤 Users • Test Fetch</h1>

        <button
          onClick={logout}
          style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="ค้นหา: ชื่อ / อีเมล / เบอร์โทร..."
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            minWidth: 260,
            background: "#fff",
          }}
        />
        <button
          onClick={fetchUsers}
          style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
        >
          รีเฟรช
        </button>

        <div style={{ marginLeft: "auto", color: "#64748b" }}>
          ทั้งหมด <b>{total}</b> รายการ • หน้า <b>{page}</b> / {Math.max(1, Math.ceil(total / limit))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["#", "ชื่อ", "อีเมล", "เบอร์", "บทบาท", "สร้างเมื่อ", "แก้ไขล่าสุด"].map((h) => (
                <th key={h} style={{ padding: 12, background: "#10b981", color: "#fff", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, textAlign: "center", color: "#64748b" }}>กำลังโหลด...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, textAlign: "center", color: "#9ca3af" }}>ไม่พบผู้ใช้</td>
              </tr>
            ) : (
              rows.map((u, i) => (
                <tr key={u._id || i} style={i % 2 ? { background: "#fbfdfc" } : undefined}>
                  <td style={td}>{(page - 1) * limit + i + 1}</td>
                  <td style={td} title={u.username || u.name}>{u.username || u.name || "-"}</td>
                  <td style={td}>{u.email || "-"}</td>
                  <td style={td}>{u.phone || "-"}</td>
                  <td style={td}>{u.role || "-"}</td>
                  <td style={td}>{fmt(u.createdAt)}</td>
                  <td style={td}>{fmt(u.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 12 }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={ghostBtn(page <= 1)}
        >
          ← ก่อนหน้า
        </button>
        <span style={{ color: "#64748b" }}>
          หน้า <b>{page}</b> / {Math.max(1, Math.ceil(total / limit))}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / limit)), p + 1))}
          disabled={page >= totalPages}
          style={ghostBtn(page >= totalPages)}
        >
          ถัดไป →
        </button>
      </div>

      {/* Flash message */}
      {message && (
        <div style={{ background: "#fef3c7", color: "#92400e", padding: "10px 14px", borderRadius: 8, marginTop: 16 }}>
          {message}
        </div>
      )}
    </div>
  );
}

const td = { padding: 10, borderBottom: "1px solid #e5e7eb", verticalAlign: "top" };
const ghostBtn = (disabled) => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: disabled ? "#9ca3af" : "#0f172a",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
});

function fmt(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
