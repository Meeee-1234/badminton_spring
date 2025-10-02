// src/Details.jsx
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
};

/** เปลี่ยนเส้นทาง API ให้ตรงกับระบบคุณ */
const ENDPOINTS = {
  taken: (date) => `${API}/api/bookings/taken?date=${encodeURIComponent(date)}`,
  mine:  (date, userId) => `${API}/api/bookings/mine?date=${encodeURIComponent(date)}&userId=${encodeURIComponent(userId)}`,
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

export default function Details() {
  const navigate = useNavigate();
  // 🔒 วัน “วันนี้” อัตโนมัติ
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [taken, setTaken] = useState([]);
  const [mine, setMine]   = useState([]);
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  // ✅ สเกลอัตโนมัติให้ “พอดีจอ”
  const [scale, setScale] = useState(1);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);

  /** ===== SCALE TO FIT ===== */
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

  /** ===== AUTO DATE UPDATE ===== */
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

  /** ===== LOAD BOOKINGS ===== */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [tRes, user] = await Promise.all([
          fetch(ENDPOINTS.taken(dateKey)),
          Promise.resolve(JSON.parse(localStorage.getItem("auth:user") || "{}")),
        ]);
        const tJson = await tRes.json();
        if (!cancelled) setTaken(tJson.taken || []);

        if (user?._id) {
          try {
            const mRes = await fetch(ENDPOINTS.mine(dateKey, user._id));
            if (!mRes.ok) throw new Error("mine endpoint not available");
            const mJson = await mRes.json();
            if (!cancelled) setMine(mJson.mine || []);
          } catch {
            if (!cancelled) setMine([]);
          }
        } else {
          if (!cancelled) setMine([]);
        }
      } catch (err) {
        console.error("Load bookings error:", err);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [dateKey]);

  const formatHourLabel = (h) => `${h.toString().padStart(2, "0")}:00 - ${h + 1}:00`;
  const isTaken = (c, h) => taken.includes(`${c}:${h}`);
  const isMine  = (c, h) => mine.includes(`${c}:${h}`);
  const isSelected = (c, h) => selected.some((s) => s.court === c && s.hour === h);

  const toggleCell = (c, h) => {
    if (isTaken(c, h) && !isMine(c, h)) return;
    setSelected((prev) =>
      prev.some((s) => s.court === c && s.hour === h)
        ? prev.filter((s) => !(s.court === c && s.hour === h))
        : [...prev, { court: c, hour: h }]
    );
  };

  /** ===== CONFIRM BOOKING ===== */
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

      // POST booking
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

      // อัปเดต state ของเราเองทันที โดยไม่ต้องรอ API
      const newMine = [...mine];
      selected.forEach((s) => {
        const key = `${s.court}:${s.hour}`;
        if (!newMine.includes(key)) newMine.push(key);
      });
      setMine(newMine);

      // อัปเดต taken (รวมของคนอื่น)
      const tRes = await fetch(ENDPOINTS.taken(dateKey));
      const tJson = await tRes.json();
      setTaken(tJson.taken || []);

      setMsg("✅ จองสำเร็จ!");
      setSelected([]);
      setNote("");
    } catch (err) {
      console.error("Booking error:", err);
      setMsg("❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    try { navigate("/"); } catch { window.location.href = "/"; }
  };

  return (
    <div ref={viewportRef} style={ui.page}>
      <div ref={contentRef} style={ui.contentWrap}>
        <div style={ui.container}>
          {/* LEFT: ตาราง */}
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

              {/* Legend */}
              <div style={ui.legendWrap} aria-hidden>
                <span style={ui.legendItem}><span style={ui.dotMine} /> ของฉัน</span>
                <span style={ui.legendItem}><span style={ui.dotPicked} /> เลือกแล้ว</span>
                <span style={ui.legendItem}><span style={ui.dotFree} /> ว่าง</span>
                <span style={ui.legendItem}><span style={ui.dotTaken} /> เต็ม</span>
              </div>
            </div>

            {/* ตาราง */}
            <div style={ui.tableFrame}>
              <div style={ui.headerRow}>
                <div style={{ ...ui.headerCell, width: 140, textAlign: "left" }}>ช่วงเวลา</div>
                {COURTS.map((c) => (
                  <div key={c} style={ui.headerCell}>คอร์ต {c}</div>
                ))}
              </div>

              <div role="table" aria-label="ตารางการจองคอร์ตแบดมินตัน" style={ui.bodyGrid}>
                {HOURS.map((h, idx) => (
                  <div key={h} role="row" style={{ ...ui.row, ...(idx % 2 === 1 ? ui.rowAlt : null) }}>
                    <div role="cell" style={{ ...ui.timeCell }}>{formatHourLabel(h)}</div>
                    {COURTS.map((c) => {
                      const takenCell = isTaken(c, h);
                      const mineCell  = isMine(c, h);
                      const picked    = isSelected(c, h);

                      // ===== แก้ไข priority ของ mineCell =====
                      let label = "ว่าง";
                      let styleForCell = ui.cellFree;

                      if (mineCell) {
                        label = "ของฉัน";
                        styleForCell = ui.cellMine;
                      } else if (takenCell) {
                        label = "เต็ม";
                        styleForCell = ui.cellTaken;
                      } else if (picked) {
                        label = "เลือกแล้ว";
                        styleForCell = ui.cellPicked;
                      }

                      const commonBtnStyle = { ...ui.cellBtn, ...styleForCell };
                      const btnProps = mineCell
                        ? { disabled: false, "aria-disabled": true, style: { ...commonBtnStyle, ...ui.mineNoDim } }
                        : { disabled: takenCell, style: commonBtnStyle };

                      return (
                        <button
                          key={`${c}:${h}`}
                          onClick={() => toggleCell(c, h)}
                          aria-pressed={picked}
                          aria-label={`คอร์ต ${c} เวลา ${formatHourLabel(h)}: ${label}`}
                          {...btnProps}
                        >
                          <span style={ui.statusPill(takenCell, picked, mineCell)}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT: สรุป */}
          <aside style={ui.right}>
            <div style={ui.card}>
              <h2 style={ui.cardTitle}>สรุปการจอง</h2>
              <div style={ui.summaryRow}><span>วันที่</span><b>{dateKey}</b></div>
              <div style={ui.summaryRow}><span>จำนวนรายการ</span><b>{selected.length} ชั่วโมง</b></div>
              <div style={ui.summaryRow}><span>ราคา/ชั่วโมง</span><b>{PRICE_PER_HOUR.toLocaleString()} บาท</b></div>
              <div style={{ ...ui.summaryRow, borderTop: `1px dashed ${colors.line}`, paddingTop: 10, marginTop: 6 }}>
                <span>รวมทั้งสิ้น</span>
                <b style={{ color: colors.accent }}>
                  {(selected.length * PRICE_PER_HOUR).toLocaleString()} บาท
                </b>
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
    display: "flex",
    gap: 24,
    padding: "12px 0",
  },
  left: { flex: 1 },
  right: { width: 320, flexShrink: 0 },
  toolbar: { display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 12 },
  backBtn: {
    background: colors.primary,
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },
  dateInput: { padding: 6, border: `1px solid ${colors.line}`, borderRadius: 6 },
  labelSm: { fontSize: 12, fontWeight: 500 },
  badgeNote: { fontSize: 11, color: colors.muted },
  legendWrap: { display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" },
  legendItem: { fontSize: 12, display: "flex", alignItems: "center", gap: 4 },
  dotMine: { display: "inline-block", width: 12, height: 12, borderRadius: 3, background: colors.primaryDark },
  dotPicked: { display: "inline-block", width: 12, height: 12, borderRadius: 3, background: colors.primary },
  dotFree: { display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "#fff", border: `1px solid ${colors.line}` },
  dotTaken: { display: "inline-block", width: 12, height: 12, borderRadius: 3, background: colors.taken },
  tableFrame: { border: `1px solid ${colors.lineStrong}`, borderRadius: 6, overflow: "hidden" },
  headerRow: { display: "flex", background: colors.lineStrong },
  headerCell: { flex: 1, padding: "6px 4px", fontWeight: 600, textAlign: "center", borderRight: `1px solid ${colors.line}` },
  bodyGrid: { display: "flex", flexDirection: "column" },
  row: { display: "flex" },
  rowAlt: { background: colors.primarySoft },
  timeCell: { width: 140, padding: 6, borderRight: `1px solid ${colors.line}` },
  cellBtn: {
    flex: 1,
    padding: 6,
    border: "none",
    cursor: "pointer",
    minHeight: 32,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  cellFree: { background: "#fff", border: `1px solid ${colors.line}` },
  cellTaken: { background: colors.taken, border: `1px solid ${colors.line}`, cursor: "not-allowed" },
  cellMine: { background: colors.primaryDark, color: "#fff" },
  cellPicked: { background: colors.primary, color: "#fff" },
  mineNoDim: { pointerEvents: "none" },
  statusPill: (takenCell, picked, mineCell) => ({
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    color: mineCell || picked ? "#fff" : takenCell ? colors.muted : colors.ink,
  }),
  card: { background: colors.card, borderRadius: 6, padding: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  cardTitle: { fontWeight: 600, marginBottom: 6 },
  summaryRow: { display: "flex", justifyContent: "space-between", marginBottom: 4 },
  textarea: { width: "100%", padding: 6, border: `1px solid ${colors.line}`, borderRadius: 6 },
  confirmBtn: {
    marginTop: 12,
    width: "100%",
    padding: 8,
    border: "none",
    borderRadius: 6,
    background: colors.primaryDark,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  selectedList: { marginTop: 6, padding: 0, listStyle: "none", fontSize: 13 },
  selectedItem: { display: "flex", justifyContent: "space-between", padding: "4px 0" },
  removeBtn: { border: "none", background: "transparent", color: colors.danger, cursor: "pointer" },
  message: { marginTop: 8, fontSize: 13 },
};
