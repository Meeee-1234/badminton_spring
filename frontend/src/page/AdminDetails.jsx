
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8080";

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

const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];

const toDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const timeLabel = (h) =>
  `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`;

const ENDPOINTS = {
  list: (date) => `${API}/api/admin/bookings?date=${encodeURIComponent(date)}`,
  setStatus: (id) => `${API}/api/admin/bookings/${id}/status`,
};

const emitUpdate = (date) => {
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("booking-events");
      bc.postMessage({ type: "booking-updated", date });
      bc.close();
    }
  } catch {}
  try {
    localStorage.setItem(
      "booking:updated",
      JSON.stringify({ date, t: Date.now() })
    );
  } catch {}
};

function normalizeStatus(raw) {
  const v = String(raw || "").toLowerCase();
  if (v === "checked_in" || v === "arrived") return "checked_in";
  if (v === "canceled" || v === "cancelled") return "canceled";
  return "booked";
}

function normalizeOne(b) {
  return {
    _id: b._id || b.id,
    court: Number(b.court),
    hour: Number(b.hour),
    status: normalizeStatus(b.status),
    userName: b.user?.name || b.userName || b.username || b.name || "-",
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

function statusBadge(status) {
  switch (status) {
    case "booked":
      return { label: "จองแล้ว", bg: "#eff6ff", bd: "#3b82f6", ink: "#1e40af" };
    case "checked_in":
      return { label: "มาแล้ว", bg: "#dcfce7", bd: "#16a34a", ink: "#065f46" };
    case "canceled":
      return { label: "ยกเลิก", bg: "#fee2e2", bd: "#ef4444", ink: "#7f1d1d" };
    default:
      return { label: status, bg: "#f3f4f6", bd: "#d1d5db", ink: "#374151" };
  }
}

export default function AdminDetails() {

  const navigate = useNavigate();

  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all"); 
  const [refreshTs, setRefreshTs] = useState(Date.now());

  const [q, setQ] = useState("");

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("auth:user") || "{}");
    if (!u || u.role !== "admin") {
      alert("คุณไม่มีสิทธิ์การเข้าถึงหน้านี้ (Admin เท่านั้น)");
      navigate("/");
    }
  }, [navigate]);

  const fetchList = async () => {
    setLoading(true);
    setMsg("");
    try {
      const ts = Date.now();
      const token = localStorage.getItem("auth:token");
      const res = await fetch(`${ENDPOINTS.list(dateKey)}&_=${ts}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (!res.ok) throw new Error(`[${res.status}] ${data?.error || text || "โหลดข้อมูลล้มเหลว"}`);

      const list = pickListShape(data)
        .map(normalizeOne)
        .filter((b) => !b.date || b.date.startsWith(dateKey));

      setBookings(list);
    } catch (e) {
      setMsg(`โหลดข้อมูลไม่สำเร็จ: ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    
    let aborted = false;
    (async () => {
      if (!aborted) await fetchList();
    })();
    return () => {
      aborted = true;
    };
  }, [dateKey, refreshTs]);

  const filtered = useMemo(() => {
    let arr = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
    const kw = q.trim().toLowerCase();
    if (kw) {
      arr = arr.filter((b) => (b.userName || "-").toLowerCase().includes(kw));
    }
    return arr;
  }, [bookings, filter, q]);

  const bookingsMap = useMemo(() => {
    const map = {};
    for (const b of filtered) {
      if (b.status !== "canceled") {
        map[`${b.court}:${b.hour}`] = b;
      }
    }
    return map;
  }, [filtered]);

const setStatus = async (id, status) => {
  try {
    const token = localStorage.getItem("auth:token");
    const res = await fetch(`${ENDPOINTS.setStatus(id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "อัพเดตสถานะล้มเหลว");

    const newStatus = normalizeStatus(status);

    if (newStatus === "canceled") {
      setBookings((prev) => prev.filter((b) => b._id !== id));
      setMsg("ยกเลิกแล้ว ช่องนี้ว่างให้คนอื่นจองได้");
    } else {
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: newStatus } : b))
      );
      setMsg("อัพเดตสถานะสำเร็จ");
    }

    emitUpdate(dateKey);
  } catch (err) {
    setMsg(" " + (err.message || String(err)));
    console.error(err);
  }
};



  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <div style={sx.leftTools}>
          <button onClick={() => navigate("/")} style={sx.btnGhost}>
            ← กลับหน้าแรก
          </button>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="date" style={sx.label}>
              วันที่
            </label>
            <input id="date" type="date" value={dateKey} style={sx.input}
                   onChange={(e) => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && setDateKey(e.target.value) } />
            <button style={sx.btnGhost} onClick={() => setDateKey(toDateKey(new Date()))}>
              วันนี้
            </button>
            <button style={{ ...sx.btnGhost, fontWeight: 900, borderColor: C.primaryDark, color: C.primaryDark, }}
                    onClick={() => setRefreshTs(Date.now())} title="ดึงรายการล่าสุดตอนนี้" >
              รีเฟรชตอนนี้
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={sx.rightToolsWrap}>
          <div style={sx.searchWrap}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อผู้จอง…" style={sx.searchInput} />
            {q && (
              <button onClick={() => setQ("")} style={sx.searchClear} title="ล้างคำค้น"> × </button>
            )}
          </div>

          <div style={sx.filterWrap}>
            <span style={sx.filterTitle}>สถานะ:</span>
            {[
              { k: "all", t: "ทั้งหมด" },
              { k: "booked", t: "จองแล้ว" },
              { k: "checked_in", t: "มาแล้ว" },
              { k: "canceled", t: "ยกเลิก" },
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
      </div>

      {/* ตาราง */}
      <div style={sx.layout}>
        <section style={sx.card}>
          <div style={sx.tableHeaderSticky}>
            <div style={{ ...sx.th, textAlign: "left" }}>ช่วงเวลา</div>
            {COURTS.map((c) => (
              <div key={c} style={sx.th}>
                คอร์ต {c}
              </div>
            ))}
          </div>

          <div>
            {HOURS.map((h, idx) => (
              <div key={h} style={{ ...sx.tr, ...(idx % 2 ? sx.trAlt : null) }}>
                <div style={sx.tdTime}>{timeLabel(h)}</div>
                {COURTS.map((c) => {
                  const b = bookingsMap[`${c}:${h}`];
                  if (!b) {
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
            <div style={{ color: C.muted, fontSize: 13 }}>
              ทั้งหมด <b>{filtered.length}</b> รายการ
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ color: C.muted }}>กำลังโหลด...</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: C.muted }}>
                {q.trim() ? "ไม่พบชื่อที่ค้นหา" : "ไม่มีรายการ"}
              </div>
            ) : (
              filtered
                .slice()
                .sort((a, b) => a.court - b.court || a.hour - b.hour)
                .map((b) => {
                  const st = statusBadge(b.status);
                  return (
                    <div key={b._id} style={sx.sideItem}>
                      <div style={sx.rowBetween}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{b.userName || "-"}</div>
                          <div style={{ color: C.muted, fontSize: 13 }}>
                            คอร์ต {b.court} • {timeLabel(b.hour)}
                          </div>
                        </div>
                        <span
                          style={{
                            ...sx.badge,
                            background: st.bg,
                            borderColor: st.bd,
                            color: st.ink,
                          }}
                        >
                          {st.label}
                        </span>
                      </div>

                      <div style={sx.btnRow}>
                        <button
                          style={sx.btnPrimary}
                          onClick={() => setStatus(b._id, "arrived")}
                          disabled={b.status === "checked_in" || b.status === "arrived"}
                          title="ทำเครื่องหมายว่า 'มาแล้ว'" >
                          ✓ มาแล้ว
                        </button>

                        <button
                          style={sx.btnWarn}
                          onClick={() => setStatus(b._id, "canceled")}
                          disabled={b.status === "canceled"}
                          title="ยกเลิกรายการนี้" >
                          ⨯ ยกเลิก
                        </button>
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

  rightToolsWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  searchWrap: {
    position: "relative",
  },
  searchInput: {
    padding: "10px 36px 10px 12px",
    border: `1px solid ${C.line2}`,
    borderRadius: 10,
    background: "#fff",
    fontSize: 14,
    outline: "none",
    minWidth: 220,
  },
  searchClear: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    border: `1px solid ${C.line2}`,
    background: "#fff",
    borderRadius: 8,
    width: 24,
    height: 24,
    lineHeight: "22px",
    textAlign: "center",
    cursor: "pointer",
    fontWeight: 900,
    color: C.muted,
  },

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

  layout: {
    width: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 16,
  },

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

  td: {
    padding: 0,
    borderLeft: `1px solid ${C.line}`,
    minHeight: 72,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

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

  rowBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

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
