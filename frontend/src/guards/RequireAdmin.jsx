// src/guards/RequireAdmin.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "https://badminton-hzwm.onrender.com";

/**
 * ใช้ครอบหน้า Admin เพื่อบังคับสิทธิ์เฉพาะ role=admin เท่านั้น
 * ลอจิก: 
 * 1) อ่าน token + user จาก localStorage (กรองเร็ว)
 * 2) ยิงเช็กที่เซิร์ฟเวอร์อีกรอบ (แม่นยำ) ถ้าโดน 401/403 => เด้งออก
 */
export default function RequireAdmin({ children }) {
  const [status, setStatus] = useState("checking"); // checking | allowed | denied

  useEffect(() => {
    const token = localStorage.getItem("auth:token");
    const rawUser = localStorage.getItem("auth:user");
    let user = null;

    try { user = rawUser ? JSON.parse(rawUser) : null; } catch {}

    // ไม่มี token หรือไม่มี user => ปฏิเสธทันที
    if (!token || !user) {
      setStatus("denied");
      return;
    }

    // ถ้า local role ไม่ใช่ admin ให้เด้งออกไว้ก่อน
    if (user?.role !== "admin") {
      setStatus("denied");
      return;
    }

    // ยืนยันกับเซิร์ฟเวอร์อีกรอบ
    (async () => {
      try {
        // สร้าง endpoint ง่าย ๆ ฝั่งเซิร์ฟเวอร์ เช่น GET /api/admin/ping ที่ requireRole('admin')
        const res = await fetch(`${API}/api/admin/ping`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          setStatus("allowed");
        } else {
          setStatus("denied");
        }
      } catch {
        setStatus("denied");
      }
    })();
  }, []);

  if (status === "checking") {
    return (
      <div style={{ padding: 24, fontFamily: "Segoe UI, sans-serif" }}>
        กำลังตรวจสอบสิทธิ์ผู้ใช้...
      </div>
    );
  }

  if (status === "denied") {
    // เด้งไปหน้า login หรือหน้าแรกตามที่ต้องการ
    return <Navigate to="/login" replace />;
  }

  return children;
}
