// src/Details.jsx
import React, { useEffect, useMemo, useState } from "react";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/** ===== CONFIG ===== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21; // ช่องสุดท้าย 20:00–21:00
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];
const PRICE_PER_HOUR = 80;

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
  primary: "#34d399",      // เขียวอ่อน
  primaryDark: "#10b981",  // เขียวกลาง
  primarySoft: "#ecfdf5",  // พื้นหลังเขียวจาง
  accent: "#22c55e",       // เขียวสด
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e5e7eb",
  card: "#ffffff",
  bg: "#f6fef8",           // เขียวอมขาวทั้งหน้า
  danger: "#ef4444",
  success: "#16a34a",
  taken: "#e5e7eb",
};

export default function Details() {
  // 🔒 ล็อกให้เป็น “วันนี้” เสมอ
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [taken, setTaken] = useState([]);    // ["1:9","2:10"]
  const [selected, setSelected] = useState([]); // [{court, hour}]
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const totalHours = selected.length;
  const totalPrice = totalHours * PRICE_PER_HOUR;

  // ⏱️ อัปเดตเป็นวันใหม่อัตโนมัติทุกเที่ยงคืน (และรีเฟรชตาราง)
  useEffect(() => {
    const tick = () => {
      const today = toDateKey();
      setDateKey((prev) => (prev !== today ? today : prev));
    };

    // ตั้งครั้งแรกตอนเข้า
    tick();

    // setTimeout ถึงเที่ยงคืน จากนั้น setInterval ทุก 24 ชม.
    const first = setTimeout(() => {
      tick();
      const everyDay = setInterval(tick, 24 * 60 * 60 * 1000);
      // เก็บไว้ในตัวแปร global ของ effect เพื่อเคลียร์
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

  // โหลดรายการที่ถูกจองแล้วจาก backend (ทุกครั้งที่วันเปลี่ยน)
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
    if (isSelected(c, h)) {
      setSelected((prev) => prev.filter((s) => !(s.court === c && s.hour === h)));
    } else {
      setSelected((prev) => [...prev, { court: c, hour: h }]);
    }
  };

  // ✅ ยืนยันการจอง
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

      // reload ตาราง
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
              {/* 🔒 input ปิดการแก้ไข / disabled */}
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

          {/* ตารางคอร์ต x ชั่วโมง */}
          <div style={ui.tableWrap}>
            <div style={ui.headerRow}>
              <div style={{ ...ui.headerCell, width: 110 }}>เวลา</div>
              {COURTS.map((c) => (
                <div key={c} style={ui.headerCell}>คอร์ต {c}</div>
              ))}
            </div>

            {HOURS.map((h) => (
              <div key={h} style={ui.row}>
                <div style={{ ...ui.timeCell }}>{formatHourLabel(h)}</div>
                {COURTS.map((c) => {
                  const takenCell = isTaken(c, h);
                  const picked = isSelected(c, h);
                  return (
                    <button
                      key={`${c}:${h}`}
                      onClick={() => toggleCell(c, h)}
                      disabled={takenCell}
                      style={{
                        ...ui.cellBtn,
                        ...(takenCell ? ui.cellTaken : picked ? ui.cellPicked : {}),
                      }}
                      title={
                        takenCell
                          ? "ถูกจองแล้ว"
                          : picked
                          ? "เลือกรายการนี้แล้ว (คลิกเพื่อยกเลิก)"
                          : "คลิกเพื่อเลือก"
                      }
                    >
                      {takenCell ? "เต็ม" : picked ? "เลือกแล้ว" : "ว่าง"}
                    </button>
                  );
                })}
              </div>
            ))}
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

/** ===== UI styles (inline, โทนเขียวอ่อน) ===== */
const ui = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.ink,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
    padding: 16,
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 16,
  },

  /* Left */
  left: { minWidth: 0 },
  toolbar: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
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

  tableWrap: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(2,6,12,0.06)",
    overflow: "hidden",
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: `110px repeat(${COURTS.length}, 1fr)`,
    borderBottom: `1px solid ${colors.line}`,
    background: colors.primarySoft,
  },
  headerCell: {
    padding: "10px 8px",
    fontSize: 13,
    fontWeight: 800,
    textAlign: "center",
    borderLeft: `1px solid ${colors.line}`,
    color: colors.primaryDark,
  },
  row: {
    display: "grid",
    gridTemplateColumns: `110px repeat(${COURTS.length}, 1fr)`,
    borderTop: `1px solid ${colors.line}`,
  },
  timeCell: {
    padding: "10px 8px",
    fontSize: 12,
    textAlign: "left",
    background: "#fbfdfc",
    borderRight: `1px solid ${colors.line}`,
  },
  cellBtn: {
    padding: "10px 6px",
    fontSize: 12,
    background: "#fff",
    border: "none",
    borderLeft: `1px solid ${colors.line}`,
    cursor: "pointer",
    transition: "transform .05s ease",
  },
  // ✅ สีตอนเลือก: เขียวอ่อน + เส้นขอบเขียว
  cellPicked: {
    background: colors.primarySoft,
    outline: `2px solid ${colors.primary}`,
    outlineOffset: -2,
    fontWeight: 800,
    transform: "scale(0.995)",
  },
  // ❌ สีช่องที่ถูกจองแล้ว
  cellTaken: {
    background: colors.taken,
    color: "#9ca3af",
    cursor: "not-allowed",
  },

  /* Right */
  right: { minWidth: 0 },
  card: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(2,6,12,0.06)",
    padding: 12,
    position: "sticky",
    top: 16,
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
    borderRadius: 10,
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
