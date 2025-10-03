// src/Details.jsx
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
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
  mine: (date, userId) => `${API}/api/bookings/my/${encodeURIComponent(userId)}/${encodeURIComponent(date)}`,
  create: `${API}/api/bookings`,
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

export default function Details() {
  const navigate = useNavigate();

  // 🔒 วัน “วันนี้” อัตโนมัติ + เด้งเปลี่ยนเองตอนเที่ยงคืน
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [taken, setTaken] = useState([]);       // ["1:9","2:10"]
  const [mine, setMine]   = useState([]);       // ["1:9","2:10"] ของผู้ใช้
  const [selected, setSelected] = useState([]); // [{court, hour}]
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ สเกลอัตโนมัติให้ “พอดีจอ”
  const [scale, setScale] = useState(1);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);

  // เก็บ user ไว้ reuse
  const userRef = useRef(null);
  useEffect(() => {
    userRef.current = JSON.parse(localStorage.getItem("auth:user") || "{}");
  }, []);

  // คำนวณ scale เมื่อโหลด/เปลี่ยนขนาดหน้าต่าง/เนื้อหา
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

  // อัปเดตเป็นวันใหม่อัตโนมัติ "เที่ยงคืน (Local)" + กันเคส Sleep/ปลุกแท็บ
  useEffect(() => {
    let midnightTimer;

    const scheduleNext = () => {
      clearTimeout(midnightTimer);
      midnightTimer = setTimeout(() => {
        const today = toDateKey(new Date());
        setDateKey(prev => (prev !== today ? today : prev));
        scheduleNext(); // นัดหมายเที่ยงคืนถัดไป
      }, msUntilNextMidnightLocal());
    };

    // sync ทันทีรอบแรก (กันเคสเปิดทิ้งไว้ข้ามวัน)
    const todayNow = toDateKey(new Date());
    setDateKey(prev => (prev !== todayNow ? todayNow : prev));
    scheduleNext();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const t = toDateKey(new Date());
        setDateKey(prev => (prev !== t ? t : prev));
        scheduleNext(); // รีเซ็ตนัดหมายให้ตรงเที่ยงคืนถัดไป
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // เคลียร์สถานะเลือก/ข้อความเมื่อวันเปลี่ยน
  useEffect(() => {
    setSelected([]);
    setMsg("");
  }, [dateKey]);

  /** ========= โหลดสถานะจอง (taken + mine) =========
   *  ใช้ซ้ำได้ทั้งจากปุ่ม "รีเฟรช" / โฟกัสหน้าต่าง / interval
   */
  const loadTakenMine = useCallback(async () => {
    try {
      const user = userRef.current || JSON.parse(localStorage.getItem("auth:user") || "{}");

      const [tRes, mRes] = await Promise.all([
        fetch(ENDPOINTS.taken(dateKey), { cache: "no-store" }),
        user?._id
          ? fetch(ENDPOINTS.mine(dateKey, user._id), { cache: "no-store" }).catch(() => null)
          : Promise.resolve(null),
      ]);

      // taken
      if (tRes?.ok) {
        const tJson = await tRes.json();
        setTaken(Array.isArray(tJson?.taken) ? tJson.taken : []);
      } else {
        setTaken([]);
      }

      // mine
      if (mRes && mRes.ok) {
        const mJson = await mRes.json();
        setMine(Array.isArray(mJson?.mine) ? mJson.mine : []);
      } else {
        setMine([]);
      }
    } catch (err) {
      console.error("Load bookings error:", err);
      // ไม่ขึ้น error บ่อยเกินไป รบกวนผู้ใช้
    }
  }, [dateKey]);

  // โหลดครั้งแรก + ตั้ง interval (polling) + โหลดเมื่อหน้าต่างโฟกัส
  useEffect(() => {
    let cancelled = false;
    loadTakenMine();
    const onFocus = () => loadTakenMine();
    window.addEventListener("focus", onFocus);

    // ปรับช่วงเวลาได้ตามต้องการ (เช่น 7–15 วินาที)
    const intervalId = setInterval(() => {
      if (!cancelled) loadTakenMine();
    }, 10000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      clearInterval(intervalId);
    };
  }, [loadTakenMine]);

  const formatHourLabel = (h) => `${h.toString().padStart(2, "0")}:00 - ${h + 1}:00`;
  const getStatus = (c, h) => {
  const cell = taken.find(t => t.key === `${c}:${h}`);
  return cell ? cell.status : null; // คืนค่า "booked" หรือ "arrived"
};

  const isMine  = (c, h) => mine.includes(`${c}:${h}`);
  const isSelected = (c, h) => selected.some((s) => s.court === c && s.hour === h);

 const toggleCell = (c, h) => {
  const status = getStatus(c, h);
  if (status === "arrived" || status === "booked") return; // ❌ กันไม่ให้เลือกถ้าเต็ม
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
      const token = localStorage.getItem("auth:token");   // ✅ ดึง token
      
      if (!user?._id || !token) {
        setMsg("❌ กรุณาเข้าสู่ระบบก่อนจอง");
        setLoading(false);
        return;
      }

      for (const s of selected) {
        const res = await fetch(ENDPOINTS.create, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,   // ✅ ส่ง token ให้ backend
          },
          body: JSON.stringify({
            date: dateKey,
            court: s.court,
            hour: s.hour,
            note,  // ถ้ามีหมายเหตุ
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setMsg(`❌ จองคอร์ต ${s.court} เวลา ${formatHourLabel(s.hour)} ไม่สำเร็จ: ${data.error || "unknown"}`);
          setLoading(false);
          return;
        }
      }

      // ✅ อัพเดต state แบบ optimistic และเคลียร์รายการเลือก
      setMsg("✅ จองสำเร็จ!");
      const newKeys = selected.map((s) => `${s.court}:${s.hour}`);
      setMine((prev) => [...prev, ...newKeys]);
      setTaken((prev) => [...prev, ...newKeys]);
      setSelected([]);
      setNote("");

      // ✅ ดึงสถานะจริงจากเซิร์ฟเวอร์อีกรอบ ป้องกัน desync
      loadTakenMine();
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
      {/* ✅ ตัวคอนเทนต์จริง — จะถูกสเกลให้พอดีจออัตโนมัติ */}
      <div ref={contentRef} style={ui.contentWrap}>
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
                  {/* แสดงผลอย่างเดียว — เด้งเป็นวันใหม่ตอนเที่ยงคืน */}
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

              {/* Legend + ปุ่มรีเฟรช */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={ui.legendWrap} aria-hidden>
                  <span style={ui.legendItem}><span style={ui.dotMine} /> ของฉัน</span>
                  <span style={ui.legendItem}><span style={ui.dotPicked} /> เลือกแล้ว</span>
                  <span style={ui.legendItem}><span style={ui.dotFree} /> ว่าง</span>
                  <span style={ui.legendItem}><span style={ui.dotTaken} /> เต็ม</span>
                </div>

                {/* ✅ ปุ่มรีเฟรชตอนนี้ */}
                <button
                  type="button"
                  onClick={loadTakenMine}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${colors.primaryDark}`,
                    background: colors.primarySoft,
                    color: colors.primaryDark,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="ดึงสถานะล่าสุดอีกครั้ง (เช่น มีคนยกเลิกจากฝั่งแอดมิน)"
                >
                  รีเฟรชตอนนี้
                </button>
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

              <div role="table" aria-label="ตารางการจองคอร์ตแบดมินตัน" style={ui.bodyGrid}>
                {HOURS.map((h, idx) => (
                  <div key={h} role="row" style={{ ...ui.row, ...(idx % 2 === 1 ? ui.rowAlt : null) }}>
                    <div role="cell" style={{ ...ui.timeCell }}>{formatHourLabel(h)}</div>
                    {COURTS.map((c) => {
  const status   = getStatus(c, h);   // ⬅️ ใช้แทน isTaken
  const mineCell = isMine(c, h);
  const picked   = isSelected(c, h);

  let label, styleForCell;

  if (mineCell) {
    label = "ของฉัน";
    styleForCell = ui.cellMine;
  } else if (status === "arrived" || status === "booked") {
    label = "เต็ม"; // มาแล้ว หรือ จองแล้ว → เต็ม
    styleForCell = ui.cellTaken;
  } else if (picked) {
    label = "เลือกแล้ว";
    styleForCell = ui.cellPicked;
  } else {
    label = "ว่าง";
    styleForCell = ui.cellFree;
  }

                      const commonBtnStyle = { ...ui.cellBtn, ...styleForCell };
const btnProps = mineCell
  ? { disabled: false, "aria-disabled": true, style: { ...commonBtnStyle, ...ui.mineNoDim } }
  : { disabled: status === "arrived" || status === "booked", style: commonBtnStyle };

return (
  <button
    key={`${c}:${h}`}
    onClick={() => toggleCell(c, h)}
    aria-pressed={picked}
    aria-label={`คอร์ต ${c} เวลา ${formatHourLabel(h)}: ${label}`}
    {...btnProps}
  >
    <span style={ui.statusPill(status, picked, mineCell)}>{label}</span>
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

/** ===== UI (ออกแบบให้สวย แล้วสเกลทั้งบล็อกให้พอดีจอ) ===== */
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
  dotMine:  { display: "inline-block", width: 12, height: 12, borderRadius: 999, background: "#dcfce7", border: `1px solid ${colors.success}` },

  /* กรอบตาราง */
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

  bodyGrid: {
    display: "grid",
    gridAutoFlow: "row",
  },
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
  cellPicked: {
    background: colors.primarySoft,
    boxShadow: "inset 0 0 0 2px " + colors.primary,
  },
  cellTaken:  {
    background: colors.taken,
    color: "#9ca3af",
    cursor: "not-allowed",
  },
  // ✅ สีเขียวสำหรับ “ของฉัน”
  cellMine: {
    background: "#bbf7d0", // เขียวสด (tailwind: green-300)
    boxShadow: `inset 0 0 0 2px ${colors.success}`,
    color: "#065f46",
    fontWeight: 700,
    cursor: "not-allowed",
  },
  // ป้องกันปุ่มซีด/หรี่เวลาเป็นของฉัน (ไม่ใช้ disabled จริง แต่ให้กดไม่ติด)
  mineNoDim: {
    pointerEvents: "none",
    cursor: "not-allowed",
    opacity: 1,
    filter: "none",
  },

statusPill: (status, isPicked, isMine) => ({
  fontSize: 12,
  fontWeight: 800,
  padding: "6px 10px",
  borderRadius: 999,
  border: `1px solid ${
    isMine ? colors.success
    : (status === "arrived" || status === "booked") ? colors.lineStrong
    : isPicked ? colors.primaryDark
    : colors.lineStrong
  }`,
  background: isMine
    ? "#22c55e"
    : (status === "arrived" || status === "booked")
      ? "#f1f5f9"
      : isPicked
        ? "#dcfce7"
        : "#ffffff",
  color: isMine
    ? "#fff"
    : (status === "arrived" || status === "booked")
      ? "#94a3b8"
      : isPicked
        ? colors.success
        : colors.ink,
  letterSpacing: 0.2,
}),


  /* Right */
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
