// src/page/admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";

/** ============== CONFIG ============== */
// คุณอาจตั้ง API base จาก .env: VITE_API_URL
const API = import.meta?.env?.VITE_API_URL || "";
const OPEN_HOUR = 9, CLOSE_HOUR = 21;
const BOOKING_DATE_FIELD = "booking_date";
const BOOKING_HOUR_FIELD = "hour";
const BOOKING_COURT_FIELD = "court";
const BOOKING_PRICE_FIELD = "price";
const BOOKING_STATUS_FIELD = "status";

/** ============== HELPERS ============== */
const toMonthKey = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};
const firstDayOfMonth = (ym) => `${ym}-01`;
const lastDayOfMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
};
const fmtTime = (h) => `${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`;

const normalizeUsers = (p) =>
  !p ? [] :
  Array.isArray(p) ? p :
  Array.isArray(p.users) ? p.users :
  (p.data && Array.isArray(p.data.users)) ? p.data.users :
  Array.isArray(p.rows) ? p.rows : [];

const normalizeBookings = (p) =>
  !p ? [] :
  Array.isArray(p) ? p :
  Array.isArray(p.bookings) ? p.bookings :
  (p.data && Array.isArray(p.data.bookings)) ? p.data.bookings :
  Array.isArray(p.rows) ? p.rows : [];

function computeKPIs(bookings) {
  const totalBookings = bookings.length;
  const totalHours = bookings.reduce((s, b) => Number.isFinite(Number(b[BOOKING_HOUR_FIELD])) ? s + 1 : s, 0);
  const revenue = bookings.reduce((s, b) => s + (Number(b[BOOKING_PRICE_FIELD]) || 0), 0);

  const courts = new Set(bookings.map((b) => String(b[BOOKING_COURT_FIELD] ?? ""))).size || 1;
  let monthDays = 30;
  if (bookings[0]?.[BOOKING_DATE_FIELD]) {
    const ym = String(bookings[0][BOOKING_DATE_FIELD]).slice(0, 7);
    const [y, m] = ym.split("-").map(Number);
    monthDays = new Date(y, m, 0).getDate();
  }
  const capacity = courts * (CLOSE_HOUR - OPEN_HOUR) * monthDays;
  const utilization = capacity > 0 ? (totalHours / capacity) : 0;

  return { totalBookings, totalHours, revenue, utilization };
}
function groupByDay(bookings) {
  const map = {};
  for (const b of bookings) {
    const d = b[BOOKING_DATE_FIELD];
    if (!d) continue;
    map[d] = (map[d] || 0) + 1;
  }
  return Object.keys(map).sort().map((k) => ({ date: k, count: map[k] }));
}
function groupHoursByCourt(bookings) {
  const map = {};
  for (const b of bookings) {
    const c = String(b[BOOKING_COURT_FIELD] ?? "");
    const h = Number(b[BOOKING_HOUR_FIELD]);
    if (!c || !Number.isFinite(h)) continue;
    map[c] = (map[c] || 0) + 1;
  }
  return Object.keys(map).sort((a, z) => Number(a) - Number(z)).map((k) => ({ court: k, hours: map[k] }));
}
function exportToCSV(rows, filename = "bookings.csv") {
  const cols = ["id","user_name","user_email",BOOKING_DATE_FIELD,BOOKING_HOUR_FIELD,BOOKING_COURT_FIELD,BOOKING_STATUS_FIELD,BOOKING_PRICE_FIELD,"created_at"];
  const header = cols.join(",");
  const lines = rows.map((r) => cols.map((c) => {
    let v = r[c] ?? "";
    if (typeof v === "string") v = `"${v.replace(/"/g, '""')}"`;
    return v;
  }).join(","));
  const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** ============== COMPONENT ============== */
export default function AdminDashboard() {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [courtFilter, setCourtFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [msgUsers, setMsgUsers] = useState("");
  const [msgBookings, setMsgBookings] = useState("");

  useEffect(() => {
    let ignore = false;

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API}/api/admin/users`, { cache: "no-store" });
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        if (!ignore) {
          if (res.ok) setUsers(normalizeUsers(json));
          else setMsgUsers(json?.error || "โหลดผู้ใช้ไม่สำเร็จ");
        }
      } catch (e) {
        if (!ignore) setMsgUsers("เกิดข้อผิดพลาดขณะโหลดผู้ใช้");
        console.error(e);
      }
    };

    const fetchBookingsPreferred = async (ym) => {
      const tryUrls = [
        `${API}/api/admin/bookings?month=${encodeURIComponent(ym)}`,
        `${API}/api/admin/bookings?from=${encodeURIComponent(firstDayOfMonth(ym))}&to=${encodeURIComponent(lastDayOfMonth(ym))}`,
        `${API}/api/admin/bookings`,
      ];
      for (let i = 0; i < tryUrls.length; i++) {
        try {
          const res = await fetch(tryUrls[i], { cache: "no-store" });
          const text = await res.text();
          const json = text ? JSON.parse(text) : null;
          if (!res.ok) {
            if (i === tryUrls.length - 1) throw new Error(json?.error || "โหลดการจองล้มเหลว");
            continue;
          }
          const raw = normalizeBookings(json);
          if (i === tryUrls.length - 1) {
            const [y, m] = ym.split("-").map(Number);
            return raw.filter((b) => {
              const d = b[BOOKING_DATE_FIELD];
              if (typeof d !== "string") return false;
              const dt = new Date(d + "T00:00:00");
              return dt.getFullYear() === y && dt.getMonth() + 1 === m;
            });
          }
          return raw;
        } catch (e) {
          if (i === tryUrls.length - 1) throw e;
        }
      }
      return [];
    };

    const run = async () => {
      setLoading(true);
      setMsgBookings("");
      await fetchUsers();
      try {
        const list = await fetchBookingsPreferred(month);
        if (!ignore) setBookings(list);
      } catch (e) {
        if (!ignore) setMsgBookings(String(e?.message || "โหลดการจองไม่สำเร็จ"));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    run();
    return () => { ignore = true; };
  }, [month]);

  const kpis = useMemo(() => computeKPIs(bookings), [bookings]);
  const courtsInData = useMemo(() => {
    const s = new Set(bookings.map((b) => String(b[BOOKING_COURT_FIELD] ?? "")));
    return Array.from(s).filter(Boolean).sort((a, z) => Number(a) - Number(z));
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (status !== "all" && String(b[BOOKING_STATUS_FIELD]).toLowerCase() !== status) return false;
      if (courtFilter !== "all" && String(b[BOOKING_COURT_FIELD]) !== String(courtFilter)) return false;
      if (!q) return true;
      const hay = `${b.user_name || ""} ${b.user_email || ""} ${b[BOOKING_DATE_FIELD] || ""} ${b[BOOKING_COURT_FIELD] || ""} ${b[BOOKING_STATUS_FIELD] || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [bookings, search, status, courtFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const byDay = useMemo(() => groupByDay(filtered), [filtered]);
  const byCourtHours = useMemo(() => groupHoursByCourt(filtered), [filtered]);

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-slate-900 p-4 md:p-6">
      <style>{`
        .grid-kpi { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
        @media (min-width: 768px) { .grid-kpi { grid-template-columns: repeat(4, minmax(0,1fr)); gap:16px; } }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:18px; box-shadow:0 10px 30px rgba(2,6,12,0.06); }
        .title { font-weight:700; letter-spacing:.2px }
        .muted { color:#64748b }
        .btn { border-radius:12px; padding:.55rem .9rem; border:1px solid #e5e7eb; background:#fff }
        .btn:hover { box-shadow:0 8px 20px rgba(2,6,12,.06) }
        table { width:100%; border-collapse:separate; border-spacing:0; }
        th, td { padding:.75rem .75rem; border-bottom:1px solid #e5e7eb; }
        th { text-align:left; color:#475569; font-weight:600; background:#f8fafc }
        .chip { background:#f1f5f9; border-radius:999px; padding:.25rem .65rem; font-size:.75rem }
        .chip.ok { background:#dcfce7 } .chip.live { background:#dbeafe } .chip.bad { background:#fee2e2 }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="title text-2xl">Admin Dashboard</h1>
            <p className="muted mt-1">สรุปภาพรวมคำจองและผู้ใช้งาน</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="month" className="btn" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }}/>
            <button className="btn" onClick={() => exportToCSV(filtered, `bookings_${month}.csv`)}>Export CSV</button>
          </div>
        </div>

        {/* KPI */}
        <section className="grid-kpi">
          <div className="card p-4"><div className="muted">ผู้ใช้ทั้งหมด</div><div className="title text-2xl mt-1">{users.length}</div></div>
          <div className="card p-4"><div className="muted">จำนวนการจอง (เดือนนี้)</div><div className="title text-2xl mt-1">{kpis.totalBookings}</div></div>
          <div className="card p-4"><div className="muted">รายได้โดยประมาณ</div><div className="title text-2xl mt-1">{kpis.revenue.toLocaleString()} <span className="text-base font-normal">บาท</span></div></div>
          <div className="card p-4"><div className="muted">อัตราการใช้สนาม</div><div className="title text-2xl mt-1">{(kpis.utilization * 100).toFixed(1)}%</div></div>
        </section>

        {/* Charts (SVG) */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="title">จำนวนการจองต่อวัน</div>
            <Bars data={byDay} xKey="date" yKey="count" unit="" />
          </div>
          <div className="card p-4">
            <div className="title">ชั่วโมงที่ถูกจองต่อคอร์ท</div>
            <Bars data={byCourtHours} xKey="court" yKey="hours" unit="ชม." />
          </div>
        </section>

        {/* Table */}
        <section className="card p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="title text-lg">คำจองทั้งหมด</div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input className="btn w-full sm:w-72" value={search} onChange={(e)=>{setSearch(e.target.value); setPage(1);}} placeholder="ค้นหา: ชื่อ, อีเมล, วันที่, สนาม, สถานะ"/>
              <select className="btn" value={status} onChange={(e)=>{setStatus(e.target.value); setPage(1);}}>
                <option value="all">สถานะทั้งหมด</option>
                <option value="booked">booked</option>
                <option value="checked_in">checked_in</option>
                <option value="cancelled">cancelled</option>
              </select>
              <select className="btn" value={courtFilter} onChange={(e)=>{setCourtFilter(e.target.value); setPage(1);}}>
                <option value="all">คอร์ททั้งหมด</option>
                {courtsInData.map((c)=> <option key={c} value={c}>คอร์ท {c}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-auto mt-4">
            <table>
              <thead>
                <tr>
                  <th>ผู้จอง</th><th>อีเมล</th><th>วันที่</th><th>ช่วงเวลา</th><th>คอร์ท</th><th>สถานะ</th><th>ราคา</th><th>สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={8} className="py-6 muted">ไม่พบข้อมูล</td></tr>
                ) : pageRows.map((b)=>(
                  <tr key={b.id || `${b.user_email}-${b[BOOKING_DATE_FIELD]}-${b[BOOKING_COURT_FIELD]}-${b[BOOKING_HOUR_FIELD]}`}>
                    <td>{b.user_name || "-"}</td>
                    <td className="muted">{b.user_email || "-"}</td>
                    <td>{b[BOOKING_DATE_FIELD] || "-"}</td>
                    <td>{Number.isFinite(b[BOOKING_HOUR_FIELD]) ? fmtTime(b[BOOKING_HOUR_FIELD]) : "-"}</td>
                    <td>คอร์ท {b[BOOKING_COURT_FIELD]}</td>
                    <td>
                      <span className={
                        "chip " + (b[BOOKING_STATUS_FIELD]==="booked"?"ok": b[BOOKING_STATUS_FIELD]==="checked_in"?"live": b[BOOKING_STATUS_FIELD]==="cancelled"?"bad":"")
                      }>
                        {b[BOOKING_STATUS_FIELD] || "-"}
                      </span>
                    </td>
                    <td>{Number(b[BOOKING_PRICE_FIELD] ?? 0).toLocaleString()} ฿</td>
                    <td className="muted">{b.created_at ? new Date(b.created_at).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="muted">แสดง {pageRows.length} จาก {total} รายการ</div>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={()=>setPage((p)=>Math.max(1, p-1))} disabled={page<=1}>← ก่อนหน้า</button>
              <span className="muted">หน้า {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
              <button className="btn" onClick={()=>setPage((p)=>Math.min(Math.max(1, Math.ceil(total / PAGE_SIZE)), p+1))} disabled={page>=Math.max(1, Math.ceil(total / PAGE_SIZE))}>ถัดไป →</button>
            </div>
          </div>

          {(loading || msgUsers || msgBookings) && (
            <div className="mt-3">
              {loading && <div>กำลังโหลด...</div>}
              {msgUsers && <div className="text-red-600">{msgUsers}</div>}
              {msgBookings && <div className="text-red-600">{msgBookings}</div>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** ===== Mini SVG Bar Chart ===== */
function Bars({ data, xKey, yKey, unit }) {
  const W = 640, H = 220, PADX = 40, PADY = 24;
  const safe = Array.isArray(data) ? data : [];
  const maxY = safe.reduce((m, d) => Math.max(m, Number(d[yKey] || 0)), 0);
  const innerW = W - PADX * 2;
  const innerH = H - PADY * 2;
  const barW = safe.length > 0 ? Math.max(6, innerW / safe.length - 6) : 0;

  return (
    <div className="overflow-x-auto mt-3">
      <svg width={W} height={H} style={{ minWidth: 320 }}>
        <line x1={PADX} y1={H - PADY} x2={W - PADX} y2={H - PADY} stroke="#e5e7eb" />
        <line x1={PADX} y1={PADY} x2={PADX} y2={H - PADY} stroke="#e5e7eb" />
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = H - PADY - innerH * t;
          const val = Math.round(maxY * t);
          return (
            <g key={i}>
              <line x1={PADX} x2={W - PADX} y1={y} y2={y} stroke="#f1f5f9" />
              <text x={8} y={y + 4} fontSize="10" fill="#64748b">{val}</text>
            </g>
          );
        })}
        {safe.map((d, i) => {
          const val = Number(d[yKey] || 0);
          const bh = maxY > 0 ? (val / maxY) * innerH : 0;
          const x = PADX + i * (barW + 6) + 8;
          const y = H - PADY - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bh} rx="6" ry="6" fill="#93c5fd" />
              <text x={x + barW / 2} y={H - PADY + 12} fontSize="10" fill="#64748b" textAnchor="middle">
                {String(d[xKey]).length > 6 ? String(d[xKey]).slice(-5) : String(d[xKey])}
              </text>
              <text x={x + barW / 2} y={y - 4} fontSize="10" fill="#0f172a" textAnchor="middle">
                {val}{unit ? ` ${unit}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
