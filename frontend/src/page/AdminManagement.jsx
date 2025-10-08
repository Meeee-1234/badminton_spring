import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [authUser, setAuthUser] = useState(null);
  const tokenRef = useRef("");

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

    const token = tokenRef.current;
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

      setUsers((prev) => prev.map((u) => (idOf(u) === id ? { ...u, deleted: true } : u)));
      alert(data.message || "ลบสำเร็จ");
    } catch (err) {
      console.error("Delete user error:", err);
      alert("ผิดพลาด: " + err.message);
    }
  };

  const fetchUsers = useCallback(async () => {
    const token = tokenRef.current;
    const res = await fetch(`${API}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "โหลด users ไม่สำเร็จ");
    setUsers(normalizeUsers(data));
  }, []);

  const fetchBookings = useCallback(async () => {
    const token = tokenRef.current;
    const res = await fetch(`${API}/api/admin/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "โหลด bookings ไม่สำเร็จ");
    setBookings(normalizeBookings(data));
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([fetchUsers(), fetchBookings()]);
      setMessage("");
    } catch (e) {
      console.error("โหลดข้อมูลไม่สำเร็จ:", e);
      setMessage(e.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, fetchBookings]);

  useEffect(() => {
    const token = localStorage.getItem("auth:token") || "";
    const user = JSON.parse(localStorage.getItem("auth:user") || "{}");
    tokenRef.current = token;
    setAuthUser(user);

    if (!token || !isAdmin(user.role)) {
      alert("คุณไม่มีสิทธิ์การเข้าถึงหน้านี้ (Admin เท่านั้น)");
      navigate("/");
      return;
    }
    loadAll();
  }, [navigate, loadAll]);

  useEffect(() => {
    const intervalMs = 15000;
    const t = setInterval(() => {
      if (!document.hidden) loadAll();
    }, intervalMs);

    const handleFocus = () => loadAll();
    window.addEventListener("focus", handleFocus);

    const handleVisibility = () => {
      if (!document.hidden) loadAll();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let bc = null;
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("booking-events");
      bc.onmessage = (e) => {
        const type = e?.data?.type || "";
        if (type === "booking-updated" || type === "admin-updated") {
          loadAll();
        }
      };
    }

    const handleStorage = (e) => {
      if (e.key === "booking:updated" && e.newValue) {
        loadAll();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(t);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
      if (bc) bc.close();
    };
  }, [loadAll]);

  const timeLabel = (h) =>
    `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`;

  const statusTh = (s) =>
    s === "booked"
      ? "จองแล้ว"
      : s === "arrived"
      ? "มาแล้ว"
      : s === "canceled"
      ? "ยกเลิก"
      : s || "-";

  const filteredBookings = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();

    return bookings.filter((b) => {
      if (statusFilter !== "all" && String(b.status) !== statusFilter) return false;
      if (searchDate && String(b.date).slice(0, 10) !== searchDate) return false;

      if (!q) return true;

      const hay = [
        b.user?.name || b.userName || "",
        b.user?.email || "",
        b.user?.phone || "",
        String(b.date || ""),
        `court ${b.court}`,
        `คอร์ต ${b.court}`,
        String(b.court || ""),
        timeLabel(b.hour || 0),
        String(b.hour || ""),
        String(b.status || ""),
        statusTh(b.status),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [bookings, searchKeyword, searchDate, statusFilter]);

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Segoe UI, sans-serif",
        background: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
            marginBottom: "20px",
          }}
        >
          ← กลับหน้าแรก
        </button>

        <h1 style={{ fontSize: 40, fontWeight: 800 }}>📊 Admin Management 📊</h1>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={loadAll}
            title="รีเฟรชตอนนี้"
            style={{
              background: "#10b981",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            รีเฟรช
          </button>
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
            Logout
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "10px 14px",
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          {message}
        </div>
      )}

      {/* Users */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>👤 Users 👤</h2>
        <br />
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
                <th style={{ padding: 12, background: "#10b981", color: "#fff" }}></th>
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
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.name || "-"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.email || "-"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>{u.phone || "-"}</td>
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
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
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
        <br />
      </section>

      {/* Bookings */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>📝 Bookings 📝</h2>
        <br />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 12,
            padding: "0 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              maxWidth: 980,
            }}
          >
            {/* คีย์เวิร์ด */}
            <div style={{ position: "relative" }}>
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="ค้นหา (ผู้ใช้/วันที่/คอร์ต/เวลา/สถานะ)…"
                style={{
                  padding: "10px 36px 10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  fontSize: 14,
                  outline: "none",
                  minWidth: 260,
                }}
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword("")}
                  title="ล้างคำค้น"
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    borderRadius: 8,
                    width: 24,
                    height: 24,
                    lineHeight: "22px",
                    textAlign: "center",
                    cursor: "pointer",
                    fontWeight: 900,
                    color: "#64748b",
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* วันที่ */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>วันที่:</label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              {searchDate && (
                <button
                  onClick={() => setSearchDate("")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #6ee7b7",
                    background: "#ecfdf5",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  ล้างวันที่
                </button>
              )}
            </div>

            {/* สถานะ */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 999,
                padding: "8px 12px",
                boxShadow: "0 4px 18px rgba(2,6,12,.05)",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 13, color: "#64748b" }}>สถานะ:</span>
              {[
                { k: "all", t: "ทั้งหมด" },
                { k: "booked", t: "จองแล้ว" },
                { k: "arrived", t: "มาแล้ว" },
                { k: "canceled", t: "ยกเลิก" },
              ].map((it) => (
                <button
                  key={it.k}
                  onClick={() => setStatusFilter(it.k)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: `1px solid ${statusFilter === it.k ? "#10b981" : "#e5e7eb"}`,
                    background: statusFilter === it.k ? "#ecfdf5" : "#fff",
                    color: statusFilter === it.k ? "#10b981" : "#0f172a",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {it.t}
                </button>
              ))}
            </div>
          </div>
        </div>

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
                {["", "User", "Date", "Court", "Hour", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: 12,
                      background: "#10b981",
                      color: "#fff",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
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
              ) : filteredBookings.length > 0 ? (
                filteredBookings.map((b, index) => (
                  <tr key={b._id || `${b.date}-${b.court}-${b.hour}-${index}`}>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "center",
                      }}
                    >
                      {index + 1}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                      {b.user?.name || b.userName || "-"}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                      {b.date}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                      {b.court}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                      {`${b.hour}:00 - ${b.hour + 1}:00`}
                    </td>
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
