// src/page/AdminDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/* ================= THEME ================ */
const C = {
  bg: "#f6fef8",
  card: "#ffffff",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e5e7eb",
  line2: "#d1d5db",
  primary: "#10b981",
  primarySoft: "#ecfdf5",
  success: "#16a34a",
  danger: "#ef4444",
  warn: "#f59e0b",
};

/* =============== CONFIG ================= */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];

/* ============ HELPERS & API ============ */
const toDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const timeLabel = (h) => `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`;

const ENDPOINTS = {
  list: (date) => `${API}/api/admin/bookings?date=${encodeURIComponent(date)}`,
  setStatus: (id) => `${API}/api/admin/bookings/${id}/status`,
  update: (id) => `${API}/api/admin/bookings/${id}`,
  remove: (id) => `${API}/api/admin/bookings/${id}`,
};

/* ================ MAIN ================= */
export default function AdminDetails() {
  const navigate = useNavigate();

  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all"); // all | booked | checked_in | cancelled

  // modal state (edit)
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({ _id: "", userName: "", note: "" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const res = await fetch(ENDPOINTS.list(dateKey), { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "โหลดข้อมูลล้มเหลว");
        setBookings(data || []);
      } catch (e) {
        setMsg("❌ โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [dateKey]);

  const bookingsMap = useMemo(() => {
    const map = {};
    for (const b of bookings) map[`${b.court}:${b.hour}`] = b;
    return map;
  }, [bookings]);

  const filtered = useMemo(
    () => (filter === "all" ? bookings : bookings.filter((b) => b.status === filter)),
    [bookings, filter]
  );

  const statusBadge = (st) => {
    if (st === "checked_in")
      return { label: "มาแล้ว", bg: "#dcfce7", bd: C.success, ink: "#065f46" };
    if (st === "cancelled")
      return { label: "ยกเลิก", bg: "#fee2e2", bd: C.danger, ink: "#7f1d1d" };
    return { label: "จองแล้ว", bg: "#f1f5f9", bd: C.line2, ink: "#334155" };
  };

  const setStatus = async (id, next) => {
    try {
      const res = await fetch(ENDPOINTS.setStatus(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "อัปเดตไม่สำเร็จ");
      setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status: next } : b)));
      setMsg("✅ อัปเดตสำเร็จ");
    } catch {
      setMsg("❌ อัปเดตไม่สำเร็จ");
    }
  };

  const removeBooking = async (id) => {
    if (!window.confirm("ยืนยันลบรายการนี้?")) return;
    try {
      const res = await fetch(ENDPOINTS.remove(id), { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBookings((prev) => prev.filter((b) => b._id !== id));
      setMsg("🗑️ ลบสำเร็จ");
    } catch {
      setMsg("❌ ลบไม่สำเร็จ");
    }
  };

  const openEdit = (b) => {
    setEditForm({ _id: b._id, userName: b.userName || "", note: b.note || "" });
    setEditOpen(true);
  };
  const saveEdit = async () => {
    setEditSaving(true);
    setMsg("");
    try {
      const res = await fetch(ENDPOINTS.update(editForm._id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: editForm.userName.trim(), note: editForm.note.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "บันทึกไม่สำเร็จ");
      setBookings((prev) =>
        prev.map((b) =>
          b._id === editForm._id ? { ...b, userName: editForm.userName, note: editForm.note } : b
        )
      );
      setEditOpen(false);
      setMsg("✅ แก้ไขสำเร็จ");
    } catch {
      setMsg("❌ แก้ไขไม่สำเร็จ");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div style={sx.page}>
      {/* Header */}
      <div style={sx.header}>
        <div style={sx.leftTools}>
          <button onClick={() => navigate("/")} style={sx.btnGhost}>← กลับหน้าแรก</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="date" style={sx.label}>วันที่</label>
            <input
              id="date"
              type="date"
              value={dateKey}
              onChange={(e) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setDateKey(e.target.value);
              }}
              style={sx.input}
            />
          </div>
        </div>

        <div style={sx.filterWrap}>
          <span style={sx.filterTitle}>สถานะ:</span>
          {[
            { k: "all", t: "ทั้งหมด" },
            { k: "booked", t: "จองแล้ว" },
            { k: "checked_in", t: "มาแล้ว" },
            { k: "cancelled", t: "ยกเลิก" },
          ].map((it) => (
            <button
              key={it.k}
              style={sx.chip(filter === it.k)}
              onClick={() => setFilter(it.k)}
              title={it.t}
            >
              {it.t}
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div style={sx.layout}>
        {/* Table */}
        <section style={sx.card}>
          <div style={sx.tableHeader}>
            <div style={{ ...sx.th, textAlign: "left" }}>ช่วงเวลา</div>
            {COURTS.map((c) => (
              <div key={c} style={sx.th}>คอร์ต {c}</div>
            ))}
          </div>

          <div>
            {HOURS.map((h, idx) => (
              <div
                key={h}
                style={{
                  ...sx.tr,
                  background: idx % 2 ? "#fbfdfc" : "#fff",
                }}
              >
                <div style={{ ...sx.tdTime }}>{timeLabel(h)}</div>
                {COURTS.map((c) => {
                  const b = bookingsMap[`${c}:${h}`];
                  if (!b || (filter !== "all" && b.status !== filter)) {
                    return (
                      <div key={c} style={{ ...sx.td, color: C.muted }}>
                        ว่าง
                      </div>
                    );
                  }
                  const st = statusBadge(b.status);
                  return (
                    <div key={c} style={sx.td}>
                      <div style={sx.rowBetween}>
                        <span style={sx.name}>{b.userName || "ไม่ระบุชื่อ"}</span>
                        <span style={{ ...sx.badge, background: st.bg, borderColor: st.bd, color: st.ink }}>
                          {st.label}
                        </span>
                      </div>

                      {b.note ? <div style={sx.note}>หมายเหตุ: {b.note}</div> : null}

                      <div style={sx.btnRow}>
                        <button style={sx.btnPrimary} onClick={() => setStatus(b._id, "checked_in")} disabled={b.status === "checked_in"}>
                          ✓ มาแล้ว
                        </button>
                        <button style={sx.btnWarn} onClick={() => setStatus(b._id, "cancelled")} disabled={b.status === "cancelled"}>
                          ⨯ ยกเลิก
                        </button>
                        <button style={sx.btnGhost} onClick={() => openEdit(b)}>
                          ✎ แก้ไข
                        </button>
                        <button style={sx.btnGhost} onClick={() => removeBooking(b._id)}>
                          🗑️ ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar list */}
        <aside style={sx.cardSide}>
          <div style={sx.sideHead}>
            <h3 style={sx.sideTitle}>รายการ {dateKey}</h3>
            <div style={{ color: C.muted, fontSize: 13 }}>ทั้งหมด <b>{filtered.length}</b> รายการ</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ color: C.muted }}>กำลังโหลด...</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: C.muted }}>ไม่มีรายการ</div>
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
                          <div style={{ fontWeight: 900 }}>{b.userName || "ไม่ระบุชื่อ"}</div>
                          <div style={{ color: C.muted, fontSize: 13 }}>
                            คอร์ต {b.court} • {timeLabel(b.hour)}
                          </div>
                        </div>
                        <span style={{ ...sx.badge, background: st.bg, borderColor: st.bd, color: st.ink }}>
                          {st.label}
                        </span>
                      </div>

                      {b.note ? <div style={sx.note}>หมายเหตุ: {b.note}</div> : null}

                      <div style={sx.btnRow}>
                        <button style={sx.btnPrimary} onClick={() => setStatus(b._id, "checked_in")} disabled={b.status === "checked_in"}>
                          ✓ มาแล้ว
                        </button>
                        <button style={sx.btnWarn} onClick={() => setStatus(b._id, "cancelled")} disabled={b.status === "cancelled"}>
                          ⨯ ยกเลิก
                        </button>
                        <button style={sx.btnGhost} onClick={() => openEdit(b)}>✎ แก้ไข</button>
                        <button style={sx.btnGhost} onClick={() => removeBooking(b._id)}>🗑️ ลบ</button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {msg && <div style={sx.msg}>{msg}</div>}
        </aside>
      </div>

      {/* Modal Edit */}
      {editOpen && (
        <div style={sx.backdrop} onClick={() => setEditOpen(false)}>
          <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, color: C.primary }}>แก้ไขข้อมูลผู้จอง</h3>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div>
                <label style={sx.label}>ชื่อผู้จอง</label>
                <input
                  type="text"
                  value={editForm.userName}
                  onChange={(e) => setEditForm((f) => ({ ...f, userName: e.target.value }))}
                  placeholder="เช่น วัฒนพงศ์ วิชาโคตร"
                  style={sx.input}
                />
              </div>
              <div>
                <label style={sx.label}>หมายเหตุ</label>
                <textarea
                  rows={3}
                  value={editForm.note}
                  onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="ข้อมูลเพิ่มเติม เช่น เบอร์ติดต่อ ฯลฯ"
                  style={{ ...sx.input, resize: "vertical" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button style={sx.btnGhost} onClick={() => setEditOpen(false)}>ยกเลิก</button>
              <button style={sx.btnPrimary} onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES =============== */
const sx = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    color: C.ink,
    padding: 16,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  leftTools: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

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
  btnRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },

  label: { fontSize: 13, color: C.muted, fontWeight: 700 },
  input: {
    padding: "10px 12px",
    border: `1px solid ${C.line2}`,
    borderRadius: 10,
    background: "#fff",
    fontSize: 14,
    outline: "none",
    width: "100%",
  },

  filterWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: `1px solid ${C.line}`,
    borderRadius: 999,
    padding: "6px 8px",
  },
  filterTitle: { fontSize: 13, color: C.muted },
  chip: (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? C.primary : C.line2}`,
    background: active ? C.primarySoft : "#fff",
    color: active ? C.primary : C.ink,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  }),

  layout: {
    width: "100%",
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: 16,
  },

  /* Table card */
  card: {
    background: C.card,
    border: `1px solid ${C.line2}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    overflow: "hidden",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: `160px repeat(${COURTS.length}, 1fr)`,
    background: C.primarySoft,
    borderBottom: `1px solid ${C.line2}`,
  },
  th: { padding: "12px 10px", fontWeight: 900, textAlign: "center", color: C.primary },
  tr: {
    display: "grid",
    gridTemplateColumns: `160px repeat(${COURTS.length}, 1fr)`,
    borderTop: `1px solid ${C.line}`,
  },
  tdTime: {
    padding: "12px 10px",
    background: "#fff",
    borderRight: `1px solid ${C.line2}`,
    fontWeight: 700,
    fontSize: 13,
  },
  td: {
    padding: "10px 8px",
    minHeight: 64,
    borderLeft: `1px solid ${C.line}`,
  },

  name: {
    fontSize: 12,
    fontWeight: 900,
    maxWidth: "65%",
    display: "inline-block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowBetween: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  note: { fontSize: 12, color: C.muted, marginTop: 4 },

  badge: {
    fontSize: 12,
    fontWeight: 900,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${C.line2}`,
  },

  /* Sidebar */
  cardSide: {
    background: C.card,
    border: `1px solid ${C.line2}`,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(2,6,12,0.06)",
    padding: 14,
    position: "sticky",
    top: 16,
    maxHeight: "calc(100vh - 32px)",
    overflow: "auto",
  },
  sideHead: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 },
  sideTitle: { margin: 0, color: C.primary, fontSize: 18 },

  sideItem: {
    border: `1px dashed ${C.line}`,
    borderRadius: 12,
    padding: 10,
    background: "#fff",
  },

  msg: {
    marginTop: 12,
    textAlign: "center",
    color: C.primary,
    fontWeight: 700,
  },

  /* Modal */
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,12,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    zIndex: 50,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 16,
    border: `1px solid ${C.line2}`,
    boxShadow: "0 20px 60px rgba(2,6,12,.2)",
    padding: 16,
  },
};
