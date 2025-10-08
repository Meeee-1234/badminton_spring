// src/page/AdminDetails.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-spring-1.onrender.com";

const colors = {
  primary: "#34d399",
  primaryDark: "#10b981",
  primarySoft: "#ecfdf5",
  accent: "#22c55e",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e5e7eb",
  lineStrong: "#d1d5db",
  card: "#ffffff",
  bg: "#f6fef8",
  danger: "#ef4444",
  success: "#16a34a",
};

const ENDPOINTS = {
  users: `${API}/api/admin/users`,
  bookingsByDate: (date) => `${API}/api/admin/bookings?date=${encodeURIComponent(date)}`,
};

function getToken() {
  try {
    return localStorage.getItem("auth:token") || "";
  } catch {
    return "";
  }
}

export default function AdminDetails() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);      // [{id,name,email,phone,role,...}]
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [dateKey, setDateKey] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const goHome = () => {
    try { navigate("/"); } catch { window.location.href = "/"; }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const token = getToken();
      const res = await fetch(ENDPOINTS.users, {
        headers: {
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        if (res.status === 403) {
          setMsg("❌ ไม่มีสิทธิ์เข้าถึง /api/admin/users (403). ตรวจสอบการล็อกอิน/สิทธิ์ ADMIN และ CORS ที่ฝั่งเซิร์ฟเวอร์");
        } else if (res.status === 404) {
          setMsg("❌ ไม่พบ endpoint /api/admin/users (404). ตรวจสอบเส้นทางที่ฝั่ง Spring Boot (Controller, @RequestMapping)");
        } else {
          setMsg(`❌ โหลดรายชื่อผู้ใช้ไม่สำเร็จ: [${res.status}] :: ${t || "unknown"}`);
        }
        setUsers([]);
      } else {
        const data = await res.json().catch(() => ({}));
        const arr = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : []);
        setUsers(arr);
      }
    } catch (e) {
      console.error(e);
      setMsg("❌ โหลดรายชื่อผู้ใช้ไม่สำเร็จ: Network/Server error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    if (!q.trim()) return users;
    const s = q.toLowerCase();
    return users.filter(u =>
      String(u.name || "").toLowerCase().includes(s) ||
      String(u.email || "").toLowerCase().includes(s) ||
      String(u.phone || "").toLowerCase().includes(s) ||
      String(u.role || "").toLowerCase().includes(s)
    );
  }, [q, users]);

  return (
    <div style={ui.page}>
      <div style={ui.container}>
        <header style={ui.header}>
          <button onClick={goHome} style={ui.backBtn}>← กลับหน้าแรก</button>
          <h1 style={ui.title}>Admin Details — รายชื่อผู้ใช้</h1>
          <div />
        </header>

        <section style={ui.toolbar}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ/อีเมล/เบอร์/สิทธิ์…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={ui.search}
            />
            <button onClick={fetchUsers} style={ui.refreshBtn}>รีเฟรช</button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={ui.label}>ดูการจองประจำวัน</label>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              style={ui.dateInput}
            />
            <button
              onClick={() => navigate(`/admin/bookings?date=${encodeURIComponent(dateKey)}`)}
              style={ui.secondaryBtn}
              title="ไปหน้าย่อยรายการจองของวัน (ถ้ามีหน้า AdminBookings)"
            >
              เปิดตารางจองของวัน
            </button>
          </div>
        </section>

        <div style={ui.card}>
          <div style={ui.tableWrap}>
            <div style={ui.tableHeader}>
              <div style={{ ...ui.th, width: 60, textAlign: "center" }}>#</div>
              <div style={{ ...ui.th, minWidth: 200 }}>ชื่อ</div>
              <div style={{ ...ui.th, minWidth: 240 }}>อีเมล</div>
              <div style={{ ...ui.th, minWidth: 140 }}>เบอร์โทร</div>
              <div style={{ ...ui.th, minWidth: 120, textAlign: "center" }}>สิทธิ์</div>
              <div style={{ ...ui.th, minWidth: 160, textAlign: "right" }}>จัดการ</div>
            </div>

            {loading ? (
              <div style={ui.loading}>กำลังโหลดรายชื่อผู้ใช้…</div>
            ) : filtered.length === 0 ? (
              <div style={ui.empty}>— ไม่พบผู้ใช้ —</div>
            ) : (
              filtered.map((u, idx) => (
                <div key={u.id || u._id || idx} style={ui.tr}>
                  <div style={{ ...ui.td, width: 60, textAlign: "center" }}>{idx + 1}</div>
                  <div style={{ ...ui.td, minWidth: 200, fontWeight: 700 }}>{u.name || "-"}</div>
                  <div style={{ ...ui.td, minWidth: 240 }}>{u.email || "-"}</div>
                  <div style={{ ...ui.td, minWidth: 140 }}>{u.phone || "-"}</div>
                  <div style={{ ...ui.td, minWidth: 120, textAlign: "center" }}>
                    <span style={ui.rolePill(u.role)}>{u.role || "USER"}</span>
                  </div>
                  <div style={{ ...ui.td, minWidth: 160, textAlign: "right" }}>
                    <button
                      onClick={() => navigate(`/admin/user/${u.id || u._id}`)}
                      style={ui.smallBtn}
                      title="ดูรายละเอียดผู้ใช้ / ประวัติการจอง"
                    >
                      รายละเอียด
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {msg && <div style={ui.message}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}

const ui = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.ink,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
    padding: 12,
  },
  container: {
    width: 1100,
    margin: "0 auto",
    display: "grid",
    gridTemplateRows: "auto auto 1fr",
    gap: 12,
  },
  header: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 10,
    alignItems: "center",
  },
  backBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.lineStrong}`,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  title: { margin: 0, fontSize: 22, fontWeight: 900, color: colors.primaryDark },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  search: {
    width: 280,
    padding: "10px 12px",
    border: `1px solid ${colors.lineStrong}`,
    borderRadius: 12,
    background: "#fff",
    outline: "none",
    fontSize: 14,
  },
  refreshBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.primaryDark}`,
    background: colors.primarySoft,
    color: colors.primaryDark,
    fontWeight: 800,
    cursor: "pointer",
  },
  label: { fontSize: 13, fontWeight: 700, color: colors.muted },
  dateInput: {
    padding: "10px 12px",
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    background: "#fff",
    fontSize: 14,
    outline: "none",
  },
  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.lineStrong}`,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },

  card: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    padding: 12,
  },
  tableWrap: {
    border: `1px solid ${colors.lineStrong}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "60px 1.2fr 1.4fr 1fr 0.8fr 0.8fr",
    background: colors.primarySoft,
    borderBottom: `1px solid ${colors.lineStrong}`,
  },
  th: {
    padding: "12px 10px",
    fontSize: 13,
    fontWeight: 900,
    color: colors.primaryDark,
    borderLeft: `1px solid ${colors.lineStrong}`,
  },
  tr: {
    display: "grid",
    gridTemplateColumns: "60px 1.2fr 1.4fr 1fr 0.8fr 0.8fr",
    borderTop: `1px solid ${colors.line}`,
    background: "#fff",
  },
  td: {
    padding: "12px 10px",
    fontSize: 14,
    borderLeft: `1px solid ${colors.line}`,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  smallBtn: {
    background: colors.primaryDark,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  },
  loading: {
    padding: 16,
    textAlign: "center",
    color: colors.muted,
    background: "#fff",
  },
  empty: {
    padding: 16,
    textAlign: "center",
    color: colors.muted,
    background: "#fff",
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    color: colors.danger,
  },
  rolePill: (role) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
    background: String(role).toUpperCase() === "ADMIN" ? "#fee2e2" : "#dcfce7",
    color: String(role).toUpperCase() === "ADMIN" ? "#b91c1c" : "#065f46",
    border: `1px solid ${String(role).toUpperCase() === "ADMIN" ? "#fecaca" : "#86efac"}`,
  }),
};
