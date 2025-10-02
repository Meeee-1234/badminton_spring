// src/AdminDetails.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/** ===== CONFIG ===== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21; // ช่องสุดท้าย 20:00–21:00
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];
const PRICE_PER_HOUR = 120;

/** THEME (โทนเขียวอ่อน) */
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
  taken: "#eef2f4",
  warn: "#f59e0b",
};

/** ENDPOINTS (ปรับให้ตรงแบ็กเอนด์ของคุณ) */
const ENDPOINTS = {
  adminList: (date) => `${API}/api/admin/bookings?date=${encodeURIComponent(date)}`,
  updateStatus: (id) => `${API}/api/admin/bookings/${encodeURIComponent(id)}/status`,
  deleteBooking: (id) => `${API}/api/admin/bookings/${encodeURIComponent(id)}`, // ถ้าใช้ลบจริง
};

/** ใช้วันที่แบบ Local (แก้ปัญหา UTC คลาดวัน) */
const toDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** ระยะเวลาถึงเที่ยงคืนครั้งถัดไป (Local) */
const msUntilNextMidnightLocal = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
};

export default function AdminDetails() {
  const navigate = useNavigate();

  // วัน “วันนี้” อัตโนมัติ + เด้งเปลี่ยนเองตอนเที่ยงคืน
  const [dateKey, setDateKey] = useState(() => toDateKey());
  // แผนผังการจองแบบละเอียดของวันนั้น
  // bookingsMap["court:hour"] = { _id, court, hour, status, userId, userName }
  const [bookingsMap, setBookingsMap] = useState({});
  // รายการทั้งหมด (ไว้แสดงในแถบขวา)
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all"); // all | booked | checked_in | cancelled

  // สเกลอัตโนมัติให้พอดีจอ
  const [scale, setScale] = useState(1);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    const calc = () => {
      const ct = contentRef.current;
      if (!ct) return;
      ct.style.transform = "scale(1)";
      ct.style.width = "auto";

      const pad = 8;
      const availW = Math.max(320, window.innerWidth - pad * 2);
      const availH = Math.max(320, window.innerHeight - pad * 2);

      const rect = ct.getBoundingClientRect();
      const neededW = rect.width;
      const neededH = rect.height;

      let s = Math.min(availW / neededW, availH / neededH, 1);
      s = Math.max(0.1, Math.min(1, Number(s.toFixed(3))));

      ct.style.transform = `scale(${s})`;
      ct.style.transformOrigin = "top left";
      ct.style.width = s < 1 ? `${100 / s}%` : "auto";
      setScale(s);

      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };

    calc();
    const onResize = () => calc();

    const ro = new ResizeObserver(calc);
    if (contentRef.current) ro.observe(contentRef.current);

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // อัปเดตเป็นวันใหม่อัตโนมัติเที่ยงคืน + กันเคส Sleep/กลับมาโฟกัส
  useEffect(() => {
    let midnightTimer;

    const scheduleNext = () => {
      clearTimeout(midnightTimer);
      midnightTimer = setTimeout(() => {
        const today = toDateKey(new Date());
        setDateKey((prev) => (prev !== today ? today : prev));
        scheduleNext();
      }, msUntilNextMidnightLocal());
    };

    // sync รอบแรก
    const todayNow = toDateKey(new Date());
    setDateKey((prev) => (prev !== todayNow ? todayNow : prev));
    scheduleNext();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const t = toDateKey(new Date());
        setDateKey((prev) => (prev !== t ? t : prev));
        scheduleNext();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // โหลดข้อมูลจองของวันนั้น
  const loadBookings = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(ENDPOINTS.adminList(dateKey), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "โหลดข้อมูลล้มเหลว");

      // คาดหวัง data = [{_id, court, hour, status, userId, userName, note?}, ...]
      const map = {};
      for (const b of data || []) {
        const key = `${b.court}:${b.hour}`;
        map[key] = b;
      }

      setBookings(data || []);
      setBookingsMap(map);
    } catch (err) {
      console.error(err);
      setMsg("❌ โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  const formatHourLabel = (h) => `${h.toString().padStart(2, "0")}:00 - ${h + 1}:00`;

  // อัปเดตสถานะ (มาแล้ว / ยกเลิก)
  const updateStatus = async (bookingId, nextStatus) => {
    try {
      const res = await fetch(ENDPOINTS.updateStatus(bookingId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "อัปเดตสถานะไม่สำเร็จ");

      // อัปเดตแบบ optimistic
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: nextStatus } : b))
      );
      setBookingsMap((prev) => {
        const newMap = { ...prev };
        for (const k in newMap) {
          if (newMap[k]?._id === bookingId) {
            newMap[k] = { ...newMap[k], status: nextStatus };
            break;
          }
        }
        return newMap;
      });
      setMsg("✅ อัปเดตสถานะสำเร็จ");
    } catch (err) {
      console.error(err);
      setMsg("❌ อัปเดตสถานะไม่สำเร็จ");
    }
  };

  // (ทางเลือก) ลบรายการ
  const deleteBooking = async (bookingId) => {
    if (!window.confirm("ยืนยันลบรายการนี้?")) return;
    try {
      const res = await fetch(ENDPOINTS.deleteBooking(bookingId), { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "ลบไม่สำเร็จ");
      }
      // remove from state
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
      setBookingsMap((prev) => {
        const map = { ...prev };
        for (const k in map) {
          if (map[k]?._id === bookingId) {
            delete map[k];
            break;
          }
        }
        return map;
      });
      setMsg("🗑️ ลบสำเร็จ");
    } catch (err) {
      console.error(err);
      setMsg("❌ ลบไม่สำเร็จ");
    }
  };

  const goHome = () => {
    try {
      navigate("/");
    } catch {
      window.location.href = "/";
    }
  };

  // สีสถานะ
  const statusStyle = (status) => {
    switch (status) {
      case "checked_in":
        return { bg: "#dcfce7", border: colors.success, text: "#065f46", label: "มาแล้ว" };
      case "cancelled":
        return { bg: "#fee2e2", border: colors.danger, text: "#7f1d1d", label: "ยกเลิก" };
      default:
        return { bg: "#f1f5f9", border: colors.lineStrong, text: "#334155", label: "จองแล้ว" }; // booked
    }
  };

  const filteredBookings = bookings.filter((b) => (filter === "all" ? true : b.status === filter));

  return (
    <div ref={viewportRef} style={ui.page}>
      <div ref={contentRef} style={ui.contentWrap}>
        <div style={ui.container}>
          {/* ซ้าย: ตารางแอดมิน */}
          <section style={ui.left}>
            <div style={ui.toolbar}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={goHome} style={ui.backBtn} title="กลับหน้าแรก">
                  ← กลับหน้าแรก
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="date" style={ui.labelSm}>วันที่ (อัตโนมัติ)</label>
                  <input
                    id="date"
                    type="date"
                    value={dateKey}
                    disabled
                    readOnly
                    title="ระบบจะอัปเดตเป็นวันใหม่โดยอัตโนมัติทุกเที่ยงคืน"
                    style={{ ...ui.dateInput, background: colors.primarySoft, borderColor: colors.primary }}
                  />
                  <span style={ui.badgeNote}>ตาราง “วันนี้” • อัปเดตอัตโนมัติเที่ยงคืน</span>
                </div>
              </div>

              {/* Filter สถานะ */}
              <div style={ui.legendWrap}>
                <span style={{ ...ui.legendItem, fontWeight: 700 }}>แอดมิน • สถานะ</span>
                <button
                  onClick={() => setFilter("all")}
                  style={ui.filterBtn(filter === "all")}
                  title="ทั้งหมด"
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setFilter("booked")}
                  style={ui.filterBtn(filter === "booked")}
                  title="จองแล้ว"
                >
                  จองแล้ว
                </button>
                <button
                  onClick={() => setFilter("checked_in")}
                  style={ui.filterBtn(filter === "checked_in")}
                  title="มาแล้ว"
                >
                  มาแล้ว
                </button>
                <button
                  onClick={() => setFilter("cancelled")}
                  style={ui.filterBtn(filter === "cancelled")}
                  title="ยกเลิก"
                >
                  ยกเลิก
                </button>
              </div>
            </div>

            <div style={ui.tableFrame}>
              <div style={ui.headerRow}>
                <div style={{ ...ui.headerCell, width: 140, textAlign: "left" }}>ช่วงเวลา</div>
                {COURTS.map((c) => (
                  <div key={c} style={ui.headerCell}>คอร์ต {c}</div>
                ))}
              </div>

              <div role="table" aria-label="ตารางการจองคอร์ต (แอดมิน)" style={ui.bodyGrid}>
                {HOURS.map((h, idx) => (
                  <div key={h} role="row" style={{ ...ui.row, ...(idx % 2 === 1 ? ui.rowAlt : null) }}>
                    <div role="cell" style={{ ...ui.timeCell }}>{formatHourLabel(h)}</div>
                    {COURTS.map((c) => {
                      const key = `${c}:${h}`;
                      const b = bookingsMap[key]; // booking ที่คาบช่องนี้
                      const isEmpty = !b;
                      const disByFilter = !isEmpty && filter !== "all" && b.status !== filter;

                      if (isEmpty || disByFilter) {
                        return (
                          <div key={key} style={{ ...ui.cellBox, ...ui.cellFree }}>
                            <span style={ui.freeText}>ว่าง</span>
                          </div>
                        );
                      }

                      const st = statusStyle(b.status);

                      return (
                        <div key={key} style={{ ...ui.cellBox, ...ui.cellBooked }}>
                          <div style={ui.topRow}>
                            <span
                              style={{
                                ...ui.nameBadge,
                                background: "#fff",
                                borderColor: colors.lineStrong,
                                color: colors.ink,
                              }}
                              title={b.userName || "-"}
                            >
                              {b.userName || "ไม่ระบุชื่อ"}
                            </span>
                            <span
                              style={{
                                ...ui.statusBadge,
                                background: st.bg,
                                borderColor: st.border,
                                color: st.text,
                              }}
                            >
                              {st.label}
                            </span>
                          </div>

                          <div style={ui.actionRow}>
                            <button
                              style={ui.actionBtn.primary}
                              onClick={() => updateStatus(b._id, "checked_in")}
                              disabled={b.status === "checked_in"}
                              title="มาแล้ว (Check-in)"
                            >
                              ✓ มาแล้ว
                            </button>
                            <button
                              style={ui.actionBtn.warn}
                              onClick={() => updateStatus(b._id, "cancelled")}
                              disabled={b.status === "cancelled"}
                              title="ยกเลิกรายการนี้"
                            >
                              ⨯ ยกเลิก
                            </button>
                            <button
                              style={ui.actionBtn.ghost}
                              onClick={() => deleteBooking(b._id)}
                              title="ลบจากระบบ (ถ้ามีสิทธิ์)"
                            >
                              🗑️ ลบ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ขวา: รายการของวัน + ปุ่มจัดการเร็ว */}
          <aside style={ui.right}>
            <div style={ui.card}>
              <h2 style={ui.cardTitle}>รายการจองวันนี้</h2>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ fontSize: 13, color: colors.muted }}>วันที่</span>
                <b>{dateKey}</b>
                <span style={{ fontSize: 13, color: colors.muted }}>ทั้งหมด</span>
                <b>{bookings.length} รายการ</b>
              </div>

              {loading ? (
                <div style={{ marginTop: 12, fontSize: 14, color: colors.muted }}>กำลังโหลด...</div>
              ) : (
                <ul style={ui.listBox}>
                  {filteredBookings
                    .slice()
                    .sort((a, b) => a.court - b.court || a.hour - b.hour)
                    .map((b) => {
                      const st = statusStyle(b.status);
                      return (
                        <li key={b._id} style={ui.listItem}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                            <div>
                              <div style={{ fontWeight: 800 }}>{b.userName || "ไม่ระบุชื่อ"}</div>
                              <div style={{ fontSize: 13, color: colors.muted }}>
                                คอร์ต {b.court} • {formatHourLabel(b.hour)}
                              </div>
                            </div>
                            <span
                              style={{
                                ...ui.statusBadge,
                                background: st.bg,
                                borderColor: st.border,
                                color: st.text,
                                alignSelf: "start",
                              }}
                            >
                              {st.label}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            <button
                              style={ui.actionBtn.primary}
                              onClick={() => updateStatus(b._id, "checked_in")}
                              disabled={b.status === "checked_in"}
                            >
                              ✓ มาแล้ว
                            </button>
                            <button
                              style={ui.actionBtn.warn}
                              onClick={() => updateStatus(b._id, "cancelled")}
                              disabled={b.status === "cancelled"}
                            >
                              ⨯ ยกเลิก
                            </button>
                            <button style={ui.actionBtn.ghost} onClick={() => deleteBooking(b._id)}>
                              🗑️ ลบ
                            </button>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}

              {msg && <div style={ui.message}>{msg}</div>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** ===== UI ===== */
const ui = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.ink,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
    padding: 8,
    overflow: "hidden",
  },
  contentWrap: {
    transform: "scale(1)",
    transformOrigin: "top left",
    width: "auto",
  },
  container: {
    width: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: 16,
  },

  /* Left */
  left: { minWidth: 0 },
  toolbar: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  backBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.lineStrong}`,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  labelSm: { display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: colors.muted },
  badgeNote: {
    display: "inline-block",
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: colors.primarySoft,
    color: colors.primaryDark,
    border: `1px solid ${colors.primary}`,
    width: "fit-content",
  },
  dateInput: {
    padding: "10px 12px",
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    background: "#fff",
    fontSize: 14,
    outline: "none",
  },

  legendWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${colors.line}`,
    boxShadow: "0 4px 18px rgba(2,6,12,.05)",
    whiteSpace: "nowrap",
  },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.muted },

  filterBtn: (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? colors.primaryDark : colors.lineStrong}`,
    background: active ? colors.primarySoft : "#fff",
    color: active ? colors.primaryDark : colors.ink,
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 700,
  }),

  /* ตาราง */
  tableFrame: {
    background: colors.card,
    border: `1px solid ${colors.lineStrong}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    overflow: "hidden",
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: `140px repeat(${COURTS.length}, 1fr)`,
    borderBottom: `1px solid ${colors.lineStrong}`,
    background: colors.primarySoft,
    boxShadow: "inset 0 -1px 0 " + colors.lineStrong,
  },
  headerCell: {
    padding: "12px 10px",
    fontSize: 13,
    fontWeight: 900,
    textAlign: "center",
    borderLeft: `1px solid ${colors.lineStrong}`,
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },
  bodyGrid: { display: "grid", gridAutoFlow: "row" },
  row: {
    display: "grid",
    gridTemplateColumns: `140px repeat(${COURTS.length}, 1fr)`,
    borderTop: `1px solid ${colors.line}`,
  },
  rowAlt: { background: "#fbfdfc" },
  timeCell: {
    padding: "12px 10px",
    fontSize: 13,
    textAlign: "left",
    background: "#ffffff",
    borderRight: `1px solid ${colors.lineStrong}`,
    fontWeight: 700,
  },

  cellBox: {
    padding: "10px 8px",
    minHeight: 64,
    borderLeft: `1px solid ${colors.line}`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 8,
  },
  cellFree: {
    background: "#fff",
  },
  cellBooked: {
    background: "#ffffff",
  },
  freeText: { fontSize: 12, color: colors.muted },

  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  nameBadge: {
    fontSize: 12,
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${colors.lineStrong}`,
    maxWidth: "65%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 900,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${colors.lineStrong}`,
  },
  actionRow: { display: "flex", gap: 6, flexWrap: "wrap" },

  actionBtn: {
    primary: {
      padding: "6px 10px",
      borderRadius: 8,
      border: `1px solid ${colors.success}`,
      background: "#dcfce7",
      color: "#065f46",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 12,
    },
    warn: {
      padding: "6px 10px",
      borderRadius: 8,
      border: `1px solid ${colors.warn}`,
      background: "#fffbeb",
      color: "#7c2d12",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 12,
    },
    ghost: {
      padding: "6px 10px",
      borderRadius: 8,
      border: `1px solid ${colors.line}`,
      background: "#fff",
      color: colors.ink,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
    },
  },

  /* ขวา */
  right: { minWidth: 0 },
  card: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    padding: 14,
    position: "sticky",
    top: 0,
    maxHeight: "calc(100vh - 16px)",
    overflow: "auto",
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 900, color: colors.primaryDark },
  listBox: { listStyle: "none", margin: 0, padding: 0, marginTop: 10 },
  listItem: {
    borderBottom: `1px dashed ${colors.line}`,
    padding: "10px 0",
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    color: colors.accent,
  },
};
