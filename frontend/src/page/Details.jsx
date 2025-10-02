// src/Details.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/** ===== CONFIG ===== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21; // ช่องสุดท้าย 20:00–21:00
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];
const PRICE_PER_HOUR = 80;

/** เปลี่ยนเส้นทาง API ให้ตรงกับระบบคุณ */
const ENDPOINTS = {
  // ตัวอย่าง: /api/bookings/taken?date=2025-10-02  (แก้ตาม backend)
  taken: (date) => `${API}/api/bookings/taken?date=${encodeURIComponent(date)}`,
  // สร้างการจอง
  create: `${API}/api/bookings`,
};

const colors = {
  primary: "#10B981",
  primaryDark: "#059669",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e5e7eb",
  card: "#ffffff",
  bg: "#f8fafc",
  danger: "#ef4444",
  success: "#16a34a",
};

function toDateKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHourLabel(h) {
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(h)}:00–${pad(h + 1)}:00`;
}

// แปลง taken array เช่น ["1:9","2:10"] -> { 1:[9], 2:[10] }
const normalizeTakenToMap = (taken = []) => {
  const map = {};
  for (const key of taken) {
    const [c, h] = String(key).split(":").map(Number);
    if (!Number.isFinite(c) || !Number.isFinite(h)) continue;
    (map[c] ??= []).push(h);
  }
  return map;
};

export default function Details() {
  const navigate = useNavigate();
  const location = useLocation();

  // รับ date จาก state หรือ query
  const search = new URLSearchParams(location.search);
  const stateDate = location.state?.date || location.state?.dateKey;
  const initDate = stateDate || search.get("date") || toDateKey(new Date());

  const [dateKey, setDateKey] = useState(initDate);
  const [takenMap, setTakenMap] = useState({}); // { courtId: [hours] }
  const [selected, setSelected] = useState([]); // [{ court, hour }]
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // ผู้ใช้ที่ล็อกอิน
  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth:user") || "null");
    } catch {
      return null;
    }
  }, []);

  // โหลดคิวที่ถูกจองแล้วของวันนั้น
  const fetchTaken = async (d) => {
    setMsg("");
    try {
      const res = await fetch(ENDPOINTS.taken(d), { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTakenMap({});
        setMsg(data?.error ? `❌ ${data.error}` : "❌ โหลดตารางไม่สำเร็จ");
        return;
      }
      const map = normalizeTakenToMap(data?.taken || []);
      setTakenMap(map);
    } catch {
      setTakenMap({});
      setMsg("❌ Server error (โหลดตารางไม่สำเร็จ)");
    }
  };

  useEffect(() => {
    fetchTaken(dateKey);
    setSelected([]); // เปลี่ยนวัน ให้ล้างที่เลือก
  }, [dateKey]);

  const isTaken = (court, hour) => (takenMap[court] || []).includes(hour);
  const isSelected = (court, hour) => selected.some((s) => s.court === court && s.hour === hour);

  const toggleCell = (court, hour) => {
    if (isTaken(court, hour)) return; // ห้ามเลือกซ้ำคิวที่ถูกจองแล้ว
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.court === court && s.hour === hour);
      if (idx >= 0) {
        const cp = prev.slice();
        cp.splice(idx, 1);
        return cp;
      }
      return [...prev, { court, hour }];
    });
  };

  const totalHours = selected.length;
  const totalPrice = totalHours * PRICE_PER_HOUR;

  const handleConfirm = async () => {
    setMsg("");
    if (!authUser?.email) {
      setMsg("❌ กรุณาเข้าสู่ระบบก่อนทำการจอง");
      return;
    }
    if (!selected.length) {
      setMsg("❌ กรุณาเลือกคอร์ตและช่วงเวลาอย่างน้อย 1 รายการ");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(ENDPOINTS.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authUser.email,
          date: dateKey,
          selections: selected.map((s) => ({ court: s.court, hour: s.hour })),
          note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg("✅ จองสำเร็จ");
        // รีโหลดตารางวันนั้น และล้างที่เลือก
        await fetchTaken(dateKey);
        setSelected([]);
        setNote("");
        // กลับหน้าแรกหรือไปหน้าประวัติการจองตามต้องการ
        setTimeout(() => navigate("/"), 800);
      } else {
        setMsg(`❌ ${data?.error || "จองไม่สำเร็จ"}`);
      }
    } catch {
      setMsg("❌ Server error (จองไม่สำเร็จ)");
    } finally {
      setLoading(false);
    }
  };

  // ป้องกันคีย์ที่ไม่ใช่ตัวเลขในช่อง phone/time? (ไม่ได้ใช้ในหน้านี้)

  return (
    <div style={ui.page}>
      <div style={ui.container}>
        {/* ซ้าย: ตัวกรอง + ตาราง */}
        <section style={ui.left}>
          <div style={ui.toolbar}>
            <div>
              <label htmlFor="date" style={ui.labelSm}>เลือกวันที่</label>
              <input
                id="date"
                type="date"
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                style={ui.dateInput}
              />
            </div>
          </div>

          {/* ตารางคอร์ต x ชั่วโมง */}
          <div style={ui.tableWrap}>
            <div style={ui.headerRow}>
              <div style={{ ...ui.headerCell, width: 86 }}>เวลา</div>
              {COURTS.map((c) => (
                <div key={c} style={ui.headerCell}>คอร์ต {c}</div>
              ))}
            </div>

            {HOURS.map((h) => (
              <div key={h} style={ui.row}>
                <div style={{ ...ui.timeCell }}>{formatHourLabel(h)}</div>
                {COURTS.map((c) => {
                  const taken = isTaken(c, h);
                  const picked = isSelected(c, h);
                  return (
                    <button
                      key={`${c}:${h}`}
                      onClick={() => toggleCell(c, h)}
                      disabled={taken}
                      style={{
                        ...ui.cellBtn,
                        ...(taken ? ui.cellTaken : picked ? ui.cellPicked : {}),
                      }}
                      title={
                        taken
                          ? "ถูกจองแล้ว"
                          : picked
                          ? "เลือกรายการนี้แล้ว (คลิกเพื่อยกเลิก)"
                          : "คลิกเพื่อเลือก"
                      }
                    >
                      {taken ? "เต็ม" : picked ? "เลือกแล้ว" : "ว่าง"}
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
              <span>รวมทั้งสิ้น</span><b style={{ color: colors.primary }}>{totalPrice.toLocaleString()} บาท</b>
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

/** ===== UI styles (inline, โทนเดียวกับ Login/Register) ===== */
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
  labelSm: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.muted },
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
    gridTemplateColumns: `86px repeat(${COURTS.length}, 1fr)`,
    borderBottom: `1px solid ${colors.line}`,
    background: "#f3f4f6",
  },
  headerCell: {
    padding: "10px 8px",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center",
    borderLeft: `1px solid ${colors.line}`,
  },
  row: {
    display: "grid",
    gridTemplateColumns: `86px repeat(${COURTS.length}, 1fr)`,
    borderTop: `1px solid ${colors.line}`,
  },
  timeCell: {
    padding: "10px 8px",
    fontSize: 12,
    textAlign: "left",
    background: "#f9fafb",
    borderRight: `1px solid ${colors.line}`,
  },
  cellBtn: {
    padding: "10px 6px",
    fontSize: 12,
    background: "#fff",
    border: "none",
    borderLeft: `1px solid ${colors.line}`,
    cursor: "pointer",
  },
  cellPicked: {
    background: "#ecfeff", // ฟ้าอ่อน
    outline: `2px solid #22d3ee`,
    outlineOffset: -2,
    fontWeight: 700,
  },
  cellTaken: {
    background: "#f5f5f5",
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
    padding: 10,
    position: "sticky",
    top: 16,
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 800 },
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
    background: colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
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
  },
};
