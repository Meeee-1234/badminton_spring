// src/page/Details.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/** ===== CONFIG ===== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];
const PRICE_PER_HOUR = 120;

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

const ENDPOINTS = {
  taken: (date) => `${API}/api/bookings/taken?date=${encodeURIComponent(date)}`,
  mine: (date, userId) => `${API}/api/bookings/mine?date=${encodeURIComponent(date)}&userId=${encodeURIComponent(userId)}`,
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

  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [taken, setTaken] = useState([]);
  const [mine, setMine] = useState([]);
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
  const isMine = (c, h) => mine.includes(`${c}:${h}`);
  const isSelected = (c, h) => selected.some((s) => s.court === c && s.hour === h);

  const toggleCell = (c, h) => {
    if (isTaken(c, h) && !isMine(c, h)) return;
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

      // reload ตาราง + mine
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
      setTaken(tJson.taken || []);
      if (mRes) {
        const mJson = await mRes.json();
        setMine(mJson.mine || []);
      }
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
                </div>
              </div>
            </div>
            <table style={ui.table}>
              <thead>
                <tr>
                  <th>เวลา\คอร์ท</th>
                  {COURTS.map((c) => <th key={c}>คอร์ท {c}</th>)}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((h) => (
                  <tr key={h}>
                    <td style={ui.hourCell}>{formatHourLabel(h)}</td>
                    {COURTS.map((c) => {
                      const takenStatus = isTaken(c, h);
                      const mineStatus = isMine(c, h);
                      const selStatus = isSelected(c, h);
                      let bg = colors.bg;
                      if (mineStatus) bg = colors.accent;
                      else if (takenStatus) bg = colors.taken;
                      else if (selStatus) bg = colors.primarySoft;
                      return (
                        <td
                          key={c}
                          style={{
                            ...ui.cell,
                            backgroundColor: bg,
                            cursor: takenStatus && !mineStatus ? "not-allowed" : "pointer",
                          }}
                          onClick={() => toggleCell(c, h)}
                        >
                          {mineStatus ? "คุณจอง" : takenStatus ? "เต็ม" : selStatus ? "✓" : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <textarea
                placeholder="หมายเหตุเพิ่มเติม..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={ui.textarea}
              />
              <button type="button" onClick={handleConfirm} disabled={loading || selected.length === 0} style={ui.confirmBtn}>
                {loading ? "กำลังบันทึก..." : "ยืนยันการจอง"}
              </button>
              {msg && <div style={ui.msg}>{msg}</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** ===== UI STYLES ===== */
const ui = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    minHeight: "100vh",
    padding: 16,
    backgroundColor: colors.bg,
  },
  contentWrap: {
    display: "inline-block",
    padding: 16,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontFamily: "sans-serif",
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  toolbar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    background: colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },
  dateInput: {
    padding: "6px 10px",
    borderRadius: 6,
    border: `1px solid ${colors.line}`,
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
  },
  hourCell: {
    padding: "6px 10px",
    fontWeight: 700,
    textAlign: "center",
    border: `1px solid ${colors.line}`,
  },
  cell: {
    padding: 6,
    textAlign: "center",
    border: `1px solid ${colors.line}`,
    borderRadius: 4,
    userSelect: "none",
  },
  textarea: {
    flex: 1,
    minHeight: 50,
    padding: 6,
    borderRadius: 6,
    border: `1px solid ${colors.line}`,
    resize: "vertical",
  },
  confirmBtn: {
    background: colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },
  msg: {
    marginTop: 6,
    color: colors.ink,
  },
};
