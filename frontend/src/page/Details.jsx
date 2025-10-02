// src/Details.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ ปุ่มกลับหน้าแรก

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/** ===== CONFIG ===== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21; // ช่องสุดท้าย 20:00–21:00
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];
const PRICE_PER_HOUR = 80;

/** ย่อทั้งหน้า 50% */
const SCALE = 0.5;

// ปรับส่วนสูงพื้นที่เหนือ/ใต้ตาราง (ยิ่งเลขมาก ตารางยิ่งเตี้ยลง)
// เมื่อใช้ SCALE แล้วมักพอดี ถ้ายังไม่เป๊ะให้ปรับเลขนี้
const OFFSET_PX = 220;

const ENDPOINTS = {
  taken: (date) => `${API}/api/bookings/taken?date=${encodeURIComponent(date)}`,
  create: `${API}/api/bookings`,
};

const toDateKey = (d = new Date()) => d.toISOString().split("T")[0];
const msUntilNextMidnight = () => {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
};

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
};

export default function Details() {
  const navigate = useNavigate();
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [taken, setTaken] = useState([]);       // ["1:9","2:10"]
  const [selected, setSelected] = useState([]); // [{court, hour}]
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const totalHours = selected.length;
  const totalPrice = totalHours * PRICE_PER_HOUR;

  // วันใหม่อัตโนมัติ เที่ยงคืน
  useEffect(() => {
    const tick = () => {
      const today = toDateKey();
      setDateKey((prev) => (prev !== today ? today : prev));
    };
    tick();
    const first = setTimeout(() => {
      tick();
      const everyDay = setInterval(tick, 24 * 60 * 60 * 1000);
      (window.__dailyTimer__ = everyDay);
    }, msUntilNextMidnight());
    return () => {
      clearTimeout(first);
      if (window.__dailyTimer__) {
        clearInterval(window.__dailyTimer__);
        delete window.__dailyTimer__;
      }
    };
  }, []);

  // โหลดสถานะจอง
  useEffect(() => {
    fetch(ENDPOINTS.taken(dateKey))
      .then((res) => res.json())
      .then((data) => setTaken(data.taken || []))
      .catch((err) => console.error("Load taken error:", err));
  }, [dateKey]);

  const formatHourLabel = (h) => `${h.toString().padStart(2, "0")}:00 - ${h + 1}:00`;
  const isTaken = (c, h) => taken.includes(`${c}:${h}`);
  const isSelected = (c, h) => selected.some((s) => s.court === c && s.hour === h);

  const toggleCell = (c, h) => {
    if (isTaken(c, h)) return;
    setSelected((prev) =>
      prev.some((s) => s.court === c && s.hour === h)
        ? prev.filter((s) => !(s.court === c && s.hour === h))
        : [...prev, { court: c, hour: h }]
    );
  };

  const handleConfirm = async () => {
    setLoading(true);
    setMsg("");
    try {
      const user = JSON.parse(localStorage.getItem("auth:user") || "{}");
      if (!user?._id) {
        setMsg("❌ กรุณาเข้าสู่ระบบก่อนจอง");
        setLoading(false);
        return;
      }
      for (const s of selected) {
        const res = await fetch(ENDPOINTS.create, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id,
            date: dateKey,
            court: s.court,
            hour: s.hour,
            note,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMsg(`❌ จองคอร์ต ${s.court} เวลา ${formatHourLabel(s.hour)} ไม่สำเร็จ: ${data.error || "unknown"}`);
          setLoading(false);
          return;
        }
      }
      setMsg("✅ จองสำเร็จ!");
      setSelected([]);
      setNote("");
      const res2 = await fetch(ENDPOINTS.taken(dateKey));
      const data2 = await res2.json();
      setTaken(data2.taken || []);
    } catch (err) {
      console.error("Booking error:", err);
      setMsg("❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  // ปุ่มกลับหน้าแรก (fallback ถ้าไม่มี router)
  const goHome = () => {
    try {
      navigate("/");
    } catch {
      window.location.href = "/";
    }
  };

  return (
    <div style={ui.page}>
      {/* ✅ ตัวครอบย่อทั้งหน้า SCALE 50% และแก้ความกว้างให้พอดี */}
      <div style={ui.scaleWrap}>
        <div style={ui.container}>
          {/* ซ้าย: ตาราง */}
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

              {/* Legend สถานะ */}
              <div style={ui.legendWrap} aria-hidden>
                <span style={ui.legendItem}><span style={ui.dotFree} /> ว่าง</span>
                <span style={ui.legendItem}><span style={ui.dotPicked} /> เลือกแล้ว</span>
                <span style={ui.legendItem}><span style={ui.dotTaken} /> เต็ม</span>
              </div>
            </div>

            {/* ตารางคอร์ต x ชั่วโมง — ไม่มีสกรอลล์ */}
            <div style={ui.tableFrame}>
              {/* หัวคอลัมน์ */}
              <div style={ui.headerRow}>
                <div style={{ ...ui.headerCell, width: 120, textAlign: "left" }}>ช่วงเวลา</div>
                {COURTS.map((c) => (
                  <div key={c} style={ui.headerCell}>คอร์ต {c}</div>
                ))}
              </div>

              {/* โซนบอดี้เต็มจอ */}
              <div role="table" aria-label="ตารางการจองคอร์ตแบดมินตัน" style={ui.bodyNoScroll}>
                {HOURS.map((h, idx) => (
                  <div key={h} role="row" style={{ ...ui.row, ...(idx % 2 === 1 ? ui.rowAlt : null) }}>
                    <div role="cell" style={{ ...ui.timeCell }}>{formatHourLabel(h)}</div>
                    {COURTS.map((c) => {
                      const takenCell = isTaken(c, h);
                      const picked = isSelected(c, h);
                      const label = takenCell ? "เต็ม" : picked ? "เลือกแล้ว" : "ว่าง";
                      return (
                        <button
                          key={`${c}:${h}`}
                          onClick={() => toggleCell(c, h)}
                          disabled={takenCell}
                          aria-pressed={picked}
                          aria-label={`คอร์ต ${c} เวลา ${formatHourLabel(h)}: ${label}`}
                          style={{
                            ...ui.cellBtn,
                            ...(takenCell ? ui.cellTaken : picked ? ui.cellPicked : ui.cellFree),
                          }}
                        >
                          <span style={ui.statusPill(takenCell, picked)}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ขวา: สรุปการจอง */}
          <aside style={ui.right}>
            <div style={ui.card}>
              <h2 style={ui.cardTitle}>สรุปการจอง</h2>
              <div style={ui.summaryRow}><span>วันที่</span><b>{dateKey}</b></div>
              <div style={ui.summaryRow}><span>จำนวนรายการ</span><b>{totalHours} ชั่วโมง</b></div>
              <div style={ui.summaryRow}><span>ราคา/ชั่วโมง</span><b>{PRICE_PER_HOUR.toLocaleString()} บาท</b></div>
              <div style={{ ...ui.summaryRow, borderTop: `1px dashed ${colors.line}`, paddingTop: 10, marginTop: 6 }}>
                <span>รวมทั้งสิ้น</span><b style={{ color: colors.accent }}>{totalPrice.toLocaleString()} บาท</b>
              </div>

              <div style={{ marginTop: 12 }}>
                <label htmlFor="note" style={ui.labelSm}>หมายเหตุ (ถ้ามี)</label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ต้องการคอร์ตติดผนัง / เปิดไฟเพิ่ม"
                  style={ui.textarea}
                  rows={2}
                />
              </div>

              <button
                onClick={handleConfirm}
                disabled={loading || !selected.length}
                style={{ ...ui.confirmBtn, opacity: loading ? 0.75 : 1 }}
              >
                {loading ? "กำลังยืนยัน..." : "ยืนยันการจอง"}
              </button>

              {!!selected.length && (
                <>
                  <div style={{ marginTop: 12, fontSize: 12, color: colors.muted }}>รายการที่เลือก</div>
                  <ul style={ui.selectedList}>
                    {selected
                      .slice()
                      .sort((a, b) => a.court - b.court || a.hour - b.hour)
                      .map((s, idx) => (
                        <li key={idx} style={ui.selectedItem}>
                          <span>คอร์ต {s.court}</span>
                          <span>{formatHourLabel(s.hour)}</span>
                          <button
                            onClick={() => toggleCell(s.court, s.hour)}
                            style={ui.removeBtn}
                            title="เอาออก"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                  </ul>
                </>
              )}

              {msg && <div style={ui.message}>{msg}</div>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** ===== UI styles (ย่อ 50% ด้วย scale + ความกว้างชดเชย) ===== */
const ui = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.ink,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
    padding: 12,
    overflow: "hidden",
  },

  // ✅ เทคนิคย่อทั้งหน้า: scale แล้วชดเชยความกว้างเพื่อไม่ให้เกิดสกรอลล์
  scaleWrap: {
    transform: `scale(${SCALE})`,
    transformOrigin: "top left",
    width: `${100 / SCALE}%`,
  },

  container: {
    maxWidth: "100vw",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    gap: 12,
  },

  /* Left */
  left: { minWidth: 0, overflow: "hidden" },
  toolbar: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
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
  labelSm: { display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: colors.muted },
  badgeNote: {
    display: "inline-block",
    fontSize: 10,
    padding: "4px 8px",
    borderRadius: 999,
    background: colors.primarySoft,
    color: colors.primaryDark,
    border: `1px solid ${colors.primary}`,
    width: "fit-content",
  },
  dateInput: {
    padding: "8px 10px",
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    background: "#fff",
    fontSize: 12,
    outline: "none",
  },

  /* Legend */
  legendWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${colors.line}`,
    boxShadow: "0 3px 12px rgba(2,6,12,.05)",
    whiteSpace: "nowrap",
  },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: colors.muted },
  dotFree: { display: "inline-block", width: 10, height: 10, borderRadius: 999, background: "#fff", border: `1px solid ${colors.lineStrong}` },
  dotPicked: { display: "inline-block", width: 10, height: 10, borderRadius: 999, background: colors.primary, border: `1px solid ${colors.primaryDark}` },
  dotTaken: { display: "inline-block", width: 10, height: 10, borderRadius: 999, background: colors.taken, border: `1px solid ${colors.lineStrong}` },

  /* กรอบตาราง */
  tableFrame: {
    background: colors.card,
    border: `1px solid ${colors.lineStrong}`,
    borderRadius: 14,
    boxShadow: "0 10px 24px rgba(2,6,12,0.06)",
    overflow: "hidden",
  },

  headerRow: {
    display: "grid",
    gridTemplateColumns: `120px repeat(${COURTS.length}, 1fr)`,
    borderBottom: `1px solid ${colors.lineStrong}`,
    background: colors.primarySoft,
    boxShadow: "inset 0 -1px 0 " + colors.lineStrong,
  },
  headerCell: {
    padding: "10px 8px",
    fontSize: 11,
    fontWeight: 900,
    textAlign: "center",
    borderLeft: `1px solid ${colors.lineStrong}`,
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },

  // ไม่มีสกรอลล์: แถวสูงเท่ากันรวมทั้งบล็อกพอดีจอ (หลัง scale แล้ว)
  bodyNoScroll: {
    height: `calc(100vh - ${OFFSET_PX}px)`,
    display: "grid",
    gridAutoFlow: "row",
    gridTemplateRows: `repeat(${HOURS.length}, 1fr)`,
    overflow: "hidden",
  },

  row: {
    display: "grid",
    gridTemplateColumns: `120px repeat(${COURTS.length}, 1fr)`,
    borderTop: `1px solid ${colors.line}`,
  },
  rowAlt: { background: "#fbfdfc" },

  timeCell: {
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    textAlign: "left",
    background: "#ffffff",
    borderRight: `1px solid ${colors.lineStrong}`,
    fontWeight: 700,
  },

  cellBtn: {
    width: "100%",
    height: "100%",
    fontSize: 11,
    background: "#fff",
    border: "none",
    borderLeft: `1px solid ${colors.line}`,
    cursor: "pointer",
    transition: "transform .06s ease, box-shadow .12s ease, background .12s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
  },
  cellFree: { background: "#fff" },
  cellPicked: {
    background: colors.primarySoft,
    boxShadow: "inset 0 0 0 2px " + colors.primary,
  },
  cellTaken: {
    background: colors.taken,
    color: "#9ca3af",
    cursor: "not-allowed",
  },

  statusPill: (isTaken, isPicked) => ({
    fontSize: 10,
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${isTaken ? colors.lineStrong : isPicked ? colors.primaryDark : colors.lineStrong}`,
    background: isTaken ? "#f1f5f9" : isPicked ? "#dcfce7" : "#ffffff",
    color: isTaken ? "#94a3b8" : isPicked ? colors.success : colors.ink,
    letterSpacing: 0.2,
  }),

  /* Right */
  right: { minWidth: 0, overflow: "hidden" },
  card: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    boxShadow: "0 10px 24px rgba(2,6,12,0.06)",
    padding: 12,
    position: "sticky",
    top: 12,
    maxHeight: "calc(100vh - 24px)",
    overflow: "auto",
  },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 900, color: colors.primaryDark },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12,
    marginTop: 8,
  },
  textarea: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: `1px solid ${colors.line}`,
    outline: "none",
    fontSize: 12,
    lineHeight: "1.5",
    background: "#fff",
    resize: "vertical",
    boxSizing: "border-box",
  },
  confirmBtn: {
    width: "100%",
    marginTop: 10,
    padding: "10px 12px",
    background: colors.primaryDark,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  },
  selectedList: {
    marginTop: 6,
    listStyle: "none",
    padding: 0,
    borderTop: `1px solid ${colors.line}`,
  },
  selectedItem: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 6,
    alignItems: "center",
    padding: "6px 0",
    fontSize: 12,
    borderBottom: `1px dashed ${colors.line}`,
  },
  removeBtn: {
    background: "transparent",
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    padding: "2px 8px",
    cursor: "pointer",
  },
  message: {
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
    color: colors.accent,
  },
};
