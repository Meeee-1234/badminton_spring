// src/page/AdminDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/* ================= THEME (โทนเดียวกับ Details.jsx) ================ */
const C = {
  bg: "#f6fef8",
  card: "#ffffff",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e5e7eb",
  line2: "#d1d5db",
  primary: "#34d399",
  primaryDark: "#10b981",
  primarySoft: "#ecfdf5",
  success: "#16a34a",
  danger: "#ef4444",
  warn: "#f59e0b",
};

/* =============== CONFIG ================= */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];

/* ============ HELPERS & API ============ */
const toDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const timeLabel = (h) => `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`;

const ENDPOINTS = {
  list: (date) => `${API}/api/admin/bookings?date=${encodeURIComponent(date)}`,
  setStatus: (id) => `${API}/api/admin/bookings/${id}/status`,
};

/* ================ NORMALIZERS ================ */
function normalizeStatus(raw) {
  const v = String(raw || "").toLowerCase();
  if (v === "checked_in" || v === "arrived") return "checked_in";
  if (v === "cancelled" || v === "canceled") return "cancelled";
  return "booked";
}
function normalizeOne(b) {
  return {
    _id: b._id || b.id,
    court: Number(b.court),
    hour: Number(b.hour),
    status: normalizeStatus(b.status),
    userName: b.userName || b.username || b.name || b.user?.name || "-",
    note: b.note || "",
    date: b.date || b.bookingDate || null,
  };
}
function pickListShape(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/* ================ MAIN ================= */
export default function AdminDetails() {
  const navigate = useNavigate();

  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all"); // all | booked | checked_in | cancelled

  // ===== ดึงข้อมูลการจอง "เฉพาะวันที่เลือก" =====
  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const token = localStorage.getItem("auth:token");
        const res = await fetch(ENDPOINTS.list(dateKey), {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch {}

        if (!res.ok) throw new Error(`[${res.status}] ${data?.error || text || "โหลดข้อมูลล้มเหลว"}`);

        // กรองซ้ำกันพลาด (ถ้า backend เผื่อส่งหลายวัน)
        const list = pickListShape(data)
          .map(normalizeOne)
          .filter((b) => !b.date || b.date.startsWith(dateKey));

        if (!aborted) setBookings(list);
      } catch (e) {
        if (!aborted) setMsg(`❌ โหลดข้อมูลไม่สำเร็จ: ${e.message || String(e)}`);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [dateKey]);

  // court:hour -> booking
  const bookingsMap = useMemo(() => {
    const map = {};
    for (const b of bookings) map[`${b.court}:${b.hour}`] = b;
    return map;
  }, [bookings]);

  const filtered = useMemo(
    () => (filter === "all" ? bookings : bookings.filter((b) => b.status === filter)),
    [bookings, filter]
  );

  const statusBadge = (st) => {
    if (st === "checked_in")
      return { label: "มาแล้ว", bg: "#dcfce7", bd: C.success, ink: "#065f46" };
    if (st === "cancelled")
      return { label: "ยกเลิก", bg: "#fee2e2", bd: C.danger, ink: "#7f1d1d" };
    return { label: "จองแล้ว", bg: "#eef2ff", bd: "#93c5fd", ink: "#1e3a8a" };
  };

  const setStatus = async (id, next) => {
    try {
      const token = localStorage.getItem("auth:token");
      const res = await fetch(ENDPOINTS.setStatus(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: next }),
      });
      const text = await res.text();
      let data = null; try { data = JSON.parse(text); } catch {}
      if (!res.ok) throw new Error(data?.error || text || "อัปเดตไม่สำเร็จ");
      setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status: next } : b)));
      setMsg("✅ อัปเดตสำเร็จ");
    } catch (e) {
      setMsg(`❌ อัปเดตไม่สำเร็จ: ${e.message || String(e)}`);
    }
  };

  return (
    <div style={sx.page}>
      {/* Header */}
      <div style={sx.header}>
        <div style={sx.leftTools}>
          <button onClick={() => navigate("/")} style={sx.btnGhost}>← กลับหน้าแรก</button>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="date" style={sx.label}>วันที่</label>
            <input
              id="date"
              type="date"
              value={dateKey}
              onChange={(e) => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && setDateKey(e.target.value)}
              style={sx.input}
            />
            <button style={sx.btnGhost} onClick={() => setDateKey(toDateKey(new Date()))}>วันนี้</button>
          </div>
        </div>

        <div style={sx.filterWrap}>
          <span style={sx.filterTitle}>สถานะ:</span>
          {[
            { k: "all", t: "ทั้งหมด" },
            { k: "booked", t: "จองแล้ว" },
            { k: "checked_in", t: "มาแล้ว" },
            { k: "cancelled", t: "ยกเลิก" },
          ].map((it) => (
            <button
              key={it.k}
              style={sx.chip(filter === it.k)}
              onClick={() => setFilter(it.k)}
            >
              {it.t}
            </button>
          ))}
        </div>
      </div>

      {/* Layout (เท่ากับ Details.jsx) */}
      <div style={sx.layout}>
        {/* ตาราง */}
        <section style={sx.card}>
          <div style={sx.tableHeaderSticky}>
            <div style={{ ...sx.th, textAlign: "left" }}>ช่วงเวลา</div>
            {COURTS.map((c) => (<div key={c} style={sx.th}>คอร์ต {c}</div>))}
          </div>

          <div>
            {HOURS.map((h, idx) => (
              <div key={h} style={{ ...sx.tr, ...(idx % 2 ? sx.trAlt : null) }}>
                <div style={sx.tdTime}>{timeLabel(h)}</div>

                {COURTS.map((c) => {
                  const b = bookingsMap[`${c}:${h}`];

                  // ว่างหรือไม่ผ่าน filter
                  if (!b || (filter !== "all" && b.status !== filter)) {
                    return (
                      <div key={c} style={sx.td}>
                        <div style={sx.cellEmpty}>–</div>
                      </div>
                    );
                  }

                  const st = statusBadge(b.status);
                  return (
                    <div
                      key={c}
                      style={sx.td}
                      title={`${b.userName || "-"} • คอร์ต ${b.court} • ${timeLabel(b.hour)}`}
                    >
                      {/* ✅ เฉพาะชื่อ + สถานะ และบังคับให้ช่องสูงเท่ากัน/จัดกลาง */}
                      <div style={sx.cellFilled(st)}>
                        <span style={sx.name}>{b.userName || "-"}</span>
                        <span
                          style={{
                            ...sx.badge,
                            background: "#fff",
                            borderColor: st.bd,
                            color: st.ink,
                          }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar */}
        <aside style={sx.cardSide}>
          <div style={sx.sideHead}>
            <h3 style={sx.sideTitle}>รายการ {dateKey}</h3>
            <div style={{ color: C.muted, fontSize: 13 }}>ทั้งหมด <b>{filtered.length}</b> รายการ</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ color: C.muted }}>กำลังโหลด...</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: C.muted }}>ไม่มีรายการ</div>
            ) : (
              filtered.slice().sort((a, b) => a.court - b.court || a.hour - b.hour).map((b) => {
                const st = statusBadge(b.status);
                return (
                  <div key={b._id} style={sx.sideItem}>
                    <div style={sx.rowBetween}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{b.userName || "-"}</div>
                        <div style={{ color: C.muted, fontSize: 13 }}>คอร์ต {b.court} • {timeLabel(b.hour)}</div>
                      </div>
                      <span style={{ ...sx.badge, background: st.bg, borderColor: st.bd, color: st.ink }}>{st.label}</span>
                    </div>

                    {/* ปุ่มเปลี่ยนสถานะ — อยู่ฝั่งขวาเท่านั้น */}
                    <div style={sx.btnRow}>
                      <button style={sx.btnPrimary} onClick={() => setStatus(b._id, "checked_in")} disabled={b.status === "checked_in"}>✓ มาแล้ว</button>
                      <button style={sx.btnWarn} onClick={() => setStatus(b._id, "cancelled")} disabled={b.status === "cancelled"}>⨯ ยกเลิก</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {msg && <div style={sx.msg}>{msg}</div>}
        </aside>
      </div>
    </div>
  );
}

/* ================= STYLES =============== */
const sx = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    color: C.ink,
    padding: 8,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  leftTools: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  btnGhost: {
    padding: "8px 12px",
    border: `1px solid ${C.line2}`,
    background: "#fff",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  btnPrimary: {
    padding: "6px 10px",
    borderRadius: 10,
    border: `1px solid ${C.success}`,
    background: "#dcfce7",
    color: "#065f46",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },
  btnWarn: {
    padding: "6px 10px",
    borderRadius: 10,
    border: `1px solid ${C.warn}`,
    background: "#fffbeb",
    color: "#7c2d12",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },
  btnRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 },

  label: { fontSize: 13, color: C.muted, fontWeight: 700 },
  input: {
    padding: "10px 12px",
    border: `1px solid ${C.line2}`,
    borderRadius: 10,
    background: "#fff",
    fontSize: 14,
    outline: "none",
  },

  filterWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: `1px solid ${C.line}`,
    borderRadius: 999,
    padding: "8px 12px",
    boxShadow: "0 4px 18px rgba(2,6,12,.05)",
    whiteSpace: "nowrap",
  },
  filterTitle: { fontSize: 13, color: C.muted },
  chip: (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? C.primaryDark : C.line2}`,
    background: active ? C.primarySoft : "#fff",
    color: active ? C.primaryDark : C.ink,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  }),

  /* === เท่ากับ Details.jsx === */
  layout: {
    width: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 16,
  },

  /* Table card */
  card: {
    background: C.card,
    border: `1px solid ${C.line2}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    overflow: "hidden",
    minWidth: 0,
  },
  tableHeaderSticky: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    display: "grid",
    gridTemplateColumns: `140px repeat(${COURTS.length}, 1fr)`,
    background: C.primarySoft,
    borderBottom: `1px solid ${C.line2}`,
    boxShadow: "inset 0 -1px 0 " + C.line2,
  },
  th: {
    padding: "12px 10px",
    fontWeight: 900,
    textAlign: "center",
    color: C.primaryDark,
    borderLeft: `1px solid ${C.line2}`,
    letterSpacing: 0.2,
  },

  tr: {
    display: "grid",
    gridTemplateColumns: `140px repeat(${COURTS.length}, 1fr)`,
    borderTop: `1px solid ${C.line}`,
  },
  trAlt: { background: "#fbfdfc" },

  tdTime: {
    padding: "12px 10px",
    background: "#fff",
    borderRight: `1px solid ${C.line2}`,
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
  },

  // ✅ กรอบเซลล์ — ให้ทุกช่องสูงเท่ากันและจัดกลาง
  td: {
    padding: 0,
    borderLeft: `1px solid ${C.line}`,
    minHeight: 72,                // ความสูงขั้นต่ำเท่ากันทุก cell
    boxSizing: "border-box",
    display: "flex",              // จัดกึ่งกลาง
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  // ✅ คอนเทนต์ภายใน cell
  cellFilled: (st) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    padding: 8,
    margin: 6,
    borderRadius: 8,
    background: st.bg,
    boxShadow: `inset 0 0 0 1px ${st.bd}`,
  }),
  cellEmpty: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1,
    userSelect: "none",
  },

  name: {
    fontSize: 12,
    fontWeight: 900,
    maxWidth: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  badge: {
    fontSize: 12,
    fontWeight: 900,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${C.line2}`,
    maxWidth: "80%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  rowBetween: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },

  /* Sidebar */
  cardSide: {
    background: C.card,
    border: `1px solid ${C.line2}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    padding: 14,
    position: "sticky",
    top: 0,
    height: "fit-content",
  },
  sideHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sideTitle: { margin: 0, color: C.primaryDark, fontSize: 18 },

  sideItem: {
    border: `1px dashed ${C.line}`,
    borderRadius: 12,
    padding: 10,
    background: "#fff",
  },

  msg: {
    marginTop: 12,
    textAlign: "center",
    color: C.primaryDark,
    fontWeight: 700,
  },
};
