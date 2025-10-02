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

/** API paths */
const ENDPOINTS = {
  taken: (date) => `${API}/api/bookings/taken?date=${encodeURIComponent(date)}`,
  mine:  (date, userId) => `${API}/api/bookings/mine?date=${encodeURIComponent(date)}&userId=${encodeURIComponent(userId)}`,
  create: `${API}/api/bookings`,
};

/** Utils */
const toDateKey = (d = new Date()) => d.toISOString().split("T")[0];
const msUntilNextMidnight = () => {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
};

// ✅ ทำให้รูปแบบคีย์ตรงกันเสมอ เช่น "1:09" -> "1:9"
const normKey = (k) => {
  if (typeof k !== "string") return "";
  const [c, h] = k.split(":");
  return `${Number(c)}:${Number(h)}`;
};

export default function Details() {
  const navigate = useNavigate();

  // state
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [taken, setTaken] = useState([]);   // ["คอร์ต:ชั่วโมง"]
  const [mine, setMine]   = useState([]);   // ["คอร์ต:ชั่วโมง"] ของผู้ใช้ปัจจุบัน
  const [selected, setSelected] = useState([]); // [{court, hour}]
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // auto-fit-to-screen
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

      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };

    calc();
    const ro = new ResizeObserver(calc);
    if (contentRef.current) ro.observe(contentRef.current);
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      ro.disconnect();
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // auto date at midnight
  useEffect(() => {
    const tick = () => setDateKey(toDateKey());
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

  // load taken + mine (normalize key ให้เรียบร้อย)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("auth:user") || "{}");

        // taken
        const tRes = await fetch(ENDPOINTS.taken(dateKey));
        const tJson = await tRes.json();
        if (!cancelled) setTaken((tJson.taken || []).map(normKey));

        // mine (รองรับทั้ง {mine:[...]} หรือ {items:[{court,hour}]})
        if (user?._id) {
          try {
            const mRes = await fetch(ENDPOINTS.mine(dateKey, user._id));
            if (mRes.ok) {
              const mJson = await mRes.json();
              if (Array.isArray(mJson.mine)) {
                if (!cancelled) setMine(mJson.mine.map(normKey));
              } else if (Array.isArray(mJson.items)) {
                if (!cancelled) setMine(mJson.items.map(it => normKey(`${it.court}:${it.hour}`)));
              } else {
                if (!cancelled) setMine([]);
              }
            } else {
              if (!cancelled) setMine([]);
            }
          } catch {
            if (!cancelled) setMine([]);
          }
        } else {
          if (!cancelled) setMine([]);
        }
      } catch (e) {
        console.error("load error:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  /** helpers */
  const formatHourLabel = (h) => `${h.toString().padStart(2, "0")}:00 - ${h + 1}:00`;
  const isTaken = (c, h) => taken.includes(`${c}:${h}`);
  const isMine  = (c, h) => mine.includes(`${c}:${h}`);
  const isSelected = (c, h) => selected.some((s) => s.court === c && s.hour === h);

  const toggleCell = (c, h) => {
    if (isTaken(c, h)) return; // เต็มแล้วห้ามกดเลือก
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

      // reload
      const [tRes, mRes] = await Promise.all([
        fetch(ENDPOINTS.taken(dateKey)),
        (async () => {
          const user = JSON.parse(localStorage.getItem("auth:user") || "{}");
          if (!user?._id) return null;
          try {
            const r = await fetch(ENDPOINTS.mine(dateKey, user._id));
            return r.ok ? r : null;
          } catch { return null; }
        })(),
      ]);
      const tJson = await tRes.json();
      setTaken((tJson.taken || []).map(normKey));
      if (mRes) {
        const mJson = await mRes.json();
        if (Array.isArray(mJson.mine)) {
          setMine(mJson.mine.map(normKey));
        } else if (Array.isArray(mJson.items)) {
          setMine(mJson.items.map(it => normKey(`${it.court}:${it.hour}`)));
        } else {
          setMine([]);
        }
      }
    } catch (e) {
      console.error("booking error:", e);
      setMsg("❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    try { navigate("/"); } catch { window.location.href = "/"; }
  };

  return (
    <div style={ui.page}>
      <div ref={contentRef} style={ui.contentWrap}>
        <div style={ui.container}>
          {/* ซ้าย: ตาราง */}
          <section style={ui.left}>
            <div style={ui.toolbar}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={goHome} style={ui.backBtn}>← กลับหน้าแรก</button>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="date" style={ui.labelSm}>วันที่ (อัตโนมัติ)</label>
                  <input id="date" type="date" value={dateKey} disabled readOnly style={{ ...ui.dateInput, background: colors.primarySoft, borderColor: colors.primary }} />
                  <span style={ui.badgeNote}>ตาราง “วันนี้” • อัปเดตอัตโนมัติเที่ยงคืน</span>
                </div>
              </div>

              {/* Legend */}
              <div style={ui.legendWrap}>
                <span style={ui.legendItem}><span style={ui.dotMine} /> เต็ม (ของฉัน)</span>
                <span style={ui.legendItem}><span style={ui.dotTaken} /> เต็ม (คนอื่น)</span>
                <span style={ui.legendItem}><span style={ui.dotPicked} /> เลือกแล้ว</span>
                <span style={ui.legendItem}><span style={ui.dotFree} /> ว่าง</span>
              </div>
            </div>

            {/* ตารางคอร์ต x ชั่วโมง */}
            <div style={ui.tableFrame}>
              <div style={ui.headerRow}>
                <div style={{ ...ui.headerCell, width: 140, textAlign: "left" }}>ช่วงเวลา</div>
                {COURTS.map((c) => (
                  <div key={c} style={ui.headerCell}>คอร์ต {c}</div>
                ))}
              </div>

              {HOURS.map((h, idx) => (
                <div key={h} style={{ ...ui.row, ...(idx % 2 === 1 ? ui.rowAlt : null) }}>
                  <div style={ui.timeCell}>{formatHourLabel(h)}</div>
                  {COURTS.map((c) => {
                    const takenCell = isTaken(c, h);
                    const mineCell  = isMine(c, h);
                    const picked    = isSelected(c, h);

                    // คำที่แสดงในแคปซูล (ยังคงเป็น "เต็ม")
                    const label = takenCell ? "เต็ม" : (picked ? "เลือกแล้ว" : "ว่าง");

                    // สีพื้นหลังของเซลล์: ใช้เทาอ่อนเมื่อเต็ม (ไม่ว่าของใคร) เพื่อความสม่ำเสมอ
                    const styleForCell =
                      takenCell ? ui.cellTaken : (picked ? ui.cellPicked : ui.cellFree);

                    // ของฉัน: ห้ามกด แต่ไม่ใช้ disabled จริง (กันสีซีด)
                    const commonBtnStyle = { ...ui.cellBtn, ...styleForCell };
                    const btnProps = mineCell
                      ? { disabled: false, "aria-disabled": true, style: { ...commonBtnStyle, ...ui.mineNoDim } }
                      : { disabled: takenCell, style: commonBtnStyle };

                    return (
                      <button
                        key={`${c}:${h}`}
                        onClick={() => toggleCell(c, h)}
                        aria-pressed={picked}
                        aria-label={`คอร์ต ${c} เวลา ${formatHourLabel(h)}: ${label}${mineCell ? " (ของฉัน)" : ""}`}
                        {...btnProps}
                      >
                        {/* ✅ ถ้าเป็น “เต็มของฉัน” ตัวหนังสือ/กรอบ/พื้นแคปซูลจะเป็นสีเขียว */}
                        <span style={ui.statusPill(takenCell, picked, mineCell)}>{label}</span>
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
              <div style={ui.summaryRow}><span>จำนวนรายการ</span><b>{selected.length} ชั่วโมง</b></div>
              <div style={ui.summaryRow}><span>ราคา/ชั่วโมง</span><b>{PRICE_PER_HOUR.toLocaleString()} บาท</b></div>
              <div style={{ ...ui.summaryRow, borderTop: `1px dashed ${colors.line}`, paddingTop: 10, marginTop: 6 }}>
                <span>รวมทั้งสิ้น</span><b style={{ color: colors.accent }}>{(selected.length * PRICE_PER_HOUR).toLocaleString()} บาท</b>
              </div>

              <div style={{ marginTop: 12 }}>
                <label htmlFor="note" style={ui.labelSm}>หมายเหตุ (ถ้ามี)</label>
                <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ต้องการคอร์ตติดผนัง / เปิดไฟเพิ่ม" style={ui.textarea} rows={3} />
              </div>

              <button onClick={handleConfirm} disabled={loading || !selected.length} style={{ ...ui.confirmBtn, opacity: loading ? 0.75 : 1 }}>
                {loading ? "กำลังยืนยัน..." : "ยืนยันการจอง"}
              </button>

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
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
    padding: 8,
    overflow: "hidden",
  },
  contentWrap: { transform: "scale(1)", transformOrigin: "top left", width: "auto" },

  container: {
    width: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 340px",
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
  legendItem: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.muted },
  dotFree:  { display: "inline-block", width: 12, height: 12, borderRadius: 999, background: "#fff", border: `1px solid ${colors.lineStrong}` },
  dotPicked:{ display: "inline-block", width: 12, height: 12, borderRadius: 999, background: colors.primary, border: `1px solid ${colors.primaryDark}` },
  dotTaken: { display: "inline-block", width: 12, height: 12, borderRadius: 999, background: colors.taken, border: `1px solid ${colors.lineStrong}` },
  dotMine:  { display: "inline-block", width: 12, height: 12, borderRadius: 999, background: "#bbf7d0", border: `1px solid ${colors.success}` },

  /* Table */
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
  },

  row: { display: "grid", gridTemplateColumns: `140px repeat(${COURTS.length}, 1fr)`, borderTop: `1px solid ${colors.line}` },
  rowAlt: { background: "#fbfdfc" },
  timeCell: {
    padding: "12px 10px",
    fontSize: 13,
    textAlign: "left",
    background: "#ffffff",
    borderRight: `1px solid ${colors.lineStrong}`,
    fontWeight: 700,
  },

  /* Cell */
  cellBtn: {
    padding: "14px 8px",
    fontSize: 13,
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
  cellFree:   { background: "#fff" },
  cellPicked: { background: colors.primarySoft, boxShadow: "inset 0 0 0 2px " + colors.primary },
  cellTaken:  { background: colors.taken, color: "#9ca3af" },

  // ป้องกันคลิกในกรณี "ของฉัน" โดยไม่ใช้ disabled (จะได้ไม่ซีด)
  mineNoDim: { pointerEvents: "none", cursor: "not-allowed", opacity: 1, filter: "none" },

  // แคปซูลคำสถานะ — ทำให้ "เต็มของฉัน" เป็นสีเขียวชัดเจน
  statusPill: (isTaken, isPicked, isMine) => {
    const isMyTaken = isTaken && isMine;
    return {
      fontSize: 12,
      fontWeight: 800,
      padding: "6px 10px",
      borderRadius: 999,
      border: `1px solid ${
        isMyTaken ? colors.success :
        isTaken   ? colors.lineStrong :
        isPicked  ? colors.primaryDark : colors.lineStrong
      }`,
      background: isMyTaken ? "#eaffef"
                : isTaken   ? "#f1f5f9"
                : isPicked  ? "#dcfce7" : "#ffffff",
      color:      isMyTaken ? colors.success
                : isTaken   ? "#94a3b8"
                : isPicked  ? colors.success : colors.ink,
      letterSpacing: 0.2,
    };
  },

  /* Right (สรุป) */
  right: { minWidth: 0 },
  card: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    padding: 14,
    position: "sticky",
    top: 0,
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 900, color: colors.primaryDark },
  summaryRow: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, marginTop: 10 },
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
  confirmBtn: { width: "100%", marginTop: 12, padding: "12px 14px", background: colors.primaryDark, color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 15 },
  message: { marginTop: 10, fontSize: 14, textAlign: "center", color: colors.accent },
};
