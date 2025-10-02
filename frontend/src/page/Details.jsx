// src/Details.jsx
import React, { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/** ===== CONFIG ===== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21; // ช่องสุดท้าย 20:00–21:00
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];
const PRICE_PER_HOUR = 80;

// ปรับได้: ส่วนสูงโดยประมาณที่ใช้โดย toolbar/legend/ระยะห่างด้านบน
// ถ้าตารางยังชนหรือเหลือพื้นที่ ปรับเลขนี้ขึ้น/ลงได้ทันที (เช่น 180, 220, 260)
const OFFSET_PX = 220;

/** เปลี่ยนเส้นทาง API ให้ตรงกับระบบคุณ */
const ENDPOINTS = {
  taken: (date) => `${API}/api/bookings/taken?date=${encodeURIComponent(date)}`,
  create: `${API}/api/bookings`,
};

/** ===== Helpers ===== */
const toDateKey = (d = new Date()) => d.toISOString().split("T")[0];
const msUntilNextMidnight = () => {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
};

/** ===== THEME (โทนเขียวอ่อน) ===== */
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
  // 🔒 ล็อกให้เป็น “วันนี้” เสมอ
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [taken, setTaken] = useState([]);       // ["1:9","2:10"]
  const [selected, setSelected] = useState([]); // [{court, hour}]
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const totalHours = selected.length;
  const totalPrice = totalHours * PRICE_PER_HOUR;

  // ⏱️ อัปเดตเป็นวันใหม่อัตโนมัติทุกเที่ยงคืน
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

  // โหลดรายการที่ถูกจองแล้วจาก backend
  useEffect(() => {
    fetch(ENDPOINTS.taken(dateKey))
      .then((res) => res.json())
      .then((data) => setTaken(data.taken || []))
      .catch((err) => console.error("Load taken error:", err));
  }, [dateKey]);

  // label เช่น 9 => "09:00 - 10:00"
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

  return (
    <div style={ui.page}>
      <div style={ui.container}>
        {/* ซ้าย: ตาราง */}
        <section style={ui.left}>
          <div style={ui.toolbar}>
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

            {/* Legend สถานะ */}
            <div style={ui.legendWrap} aria-hidden>
              <span style={ui.legendItem}><span style={ui.dotFree} /> ว่าง</span>
              <span style={ui.legendItem}><span style={ui.dotPicked} /> เลือกแล้ว</span>
              <span style={ui.legendItem}><span style={ui.dotTaken} /> เต็ม</span>
            </div>
          </div>

          {/* ตารางคอร์ต x ชั่วโมง — ไม่มีสกรอลล์ */}
          <div style={ui.tableFrame}>
            {/* หัวคอลัมน์ (คงที่ด้านบน) */}
            <div style={ui.headerRow}>
              <div style={{ ...ui.headerCell, width: 140, textAlign: "left" }}>ช่วงเวลา</div>
              {COURTS.map((c) => (
                <div key={c} style={ui.headerCell}>คอร์ต {c}</div>
              ))}
            </div>

            {/* โซนบอดี้แบบ "Grid เต็มจอ" */}
            <div
              role="table"
              aria-label="ตารางการจองคอร์ตแบดมินตัน"
              style={ui.bodyNoScroll}
            >
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
                rows={3}
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
                <div style={{ marginTop: 14, fontSize: 13, color: colors.muted }}>รายการที่เลือก</div>
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
  );
}

/** ===== UI styles (inline, โทนเขียวอ่อน + “เห็นครบโดยไม่ต้องเลื่อน”) ===== */
const COLS = COURTS.length + 1; // +1 = คอลัมน์เวลา
const ui = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.ink,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
    padding: 16,
    overflow: "hidden",        // ❗ กันการสกรอลล์ของทั้งหน้า
  },
  container: {
    maxWidth: "100vw",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 16,
  },

  /* Left */
  left: { minWidth: 0, overflow: "hidden" },
  toolbar: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  labelSm: { display: "block", fontSize: "clamp(11px, 1vw, 13px)", fontWeight: 700, marginBottom: 6, color: colors.muted },
  badgeNote: {
    display: "inline-block",
    fontSize: "clamp(10px, .9vw, 12px)",
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
    fontSize: "clamp(12px, 1vw, 14px)",
    outline: "none",
  },

  /* Legend */
  legendWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#fff",
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${colors.line}`,
    boxShadow: "0 4px 18px rgba(2,6,12,.05)",
    whiteSpace: "nowrap",
  },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: "clamp(11px, 1vw, 13px)", color: colors.muted },
  dotFree: { display: "inline-block", width: 12, height: 12, borderRadius: 999, background: "#fff", border: `1px solid ${colors.lineStrong}` },
  dotPicked: { display: "inline-block", width: 12, height: 12, borderRadius: 999, background: colors.primary, border: `1px solid ${colors.primaryDark}` },
  dotTaken: { display: "inline-block", width: 12, height: 12, borderRadius: 999, background: colors.taken, border: `1px solid ${colors.lineStrong}` },

  /* กรอบตาราง */
  tableFrame: {
    background: colors.card,
    border: `1px solid ${colors.lineStrong}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    overflow: "hidden",
  },

  /* หัวคอลัมน์ (สูงคงที่) */
  headerRow: {
    display: "grid",
    gridTemplateColumns: `140px repeat(${COURTS.length}, 1fr)`,
    borderBottom: `1px solid ${colors.lineStrong}`,
    background: colors.primarySoft,
    boxShadow: "inset 0 -1px 0 " + colors.lineStrong,
  },
  headerCell: {
    padding: "12px 10px",
    fontSize: "clamp(11px, 1vw, 13px)",
    fontWeight: 900,
    textAlign: "center",
    borderLeft: `1px solid ${colors.lineStrong}`,
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },

  /* โซนบอดี้ “ไม่มีสกรอลล์”: แบ่งแถวเป็น 12 ส่วนเท่า ๆ กัน ให้สูงรวม = (100vh - OFFSET) */
  bodyNoScroll: {
    height: `calc(100vh - ${OFFSET_PX}px)`, // ✅ ปรับ OFFSET_PX ได้ถ้ายังไม่พอดี
    display: "grid",
    gridAutoFlow: "row",
    gridTemplateRows: `repeat(${HOURS.length}, 1fr)`, // 12 แถวเท่ากัน
    overflow: "hidden",
  },

  /* แถว */
  row: {
    display: "grid",
    gridTemplateColumns: `140px repeat(${COURTS.length}, 1fr)`,
    borderTop: `1px solid ${colors.line}`,
  },
  rowAlt: { background: "#fbfdfc" },

  /* คอลัมน์เวลา (ซ้าย) */
  timeCell: {
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    fontSize: "clamp(11px, .95vw, 13px)",
    textAlign: "left",
    background: "#ffffff",
    borderRight: `1px solid ${colors.lineStrong}`,
    fontWeight: 700,
  },

  /* เซลล์สถานะ */
  cellBtn: {
    width: "100%",
    height: "100%",
    fontSize: "clamp(11px, .95vw, 13px)",
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

  // แคปซูลสถานะในเซลล์
  statusPill: (isTaken, isPicked) => ({
    fontSize: "clamp(10px, .9vw, 12px)",
    fontWeight: 800,
    padding: "6px 10px",
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
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    padding: 14,
    position: "sticky",
    top: 16,
    maxHeight: "calc(100vh - 32px)",
    overflow: "auto", // ให้การ์ดฝั่งขวาเลื่อนเองถ้าสูงเกิน
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 900, color: colors.primaryDark },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 14,
    marginTop: 10,
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${colors.line}`,
    outline: "none",
    fontSize: 14,
    lineHeight: "1.5",
    background: "#fff",
    resize: "vertical",
    boxSizing: "border-box",
  },
  confirmBtn: {
    width: "100%",
    marginTop: 12,
    padding: "12px 14px",
    background: colors.primaryDark,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 15,
  },
  selectedList: {
    marginTop: 8,
    listStyle: "none",
    padding: 0,
    borderTop: `1px solid ${colors.line}`,
  },
  selectedItem: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 8,
    alignItems: "center",
    padding: "8px 0",
    fontSize: 13,
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
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    color: colors.accent,
  },
};
