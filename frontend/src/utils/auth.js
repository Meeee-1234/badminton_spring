// src/utils/auth.js
export const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

// เลือกโหมดยืนยันตัวตน: "demo" = ส่ง Bearer <userId>, "jwt" = ส่ง Bearer <token>
export const AUTH_MODE = (process.env.REACT_APP_AUTH_MODE || "demo").toLowerCase();

export function getToken() {
  return localStorage.getItem("auth:token") || "";
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("auth:user") || "{}");
  } catch {
    return {};
  }
}

export function isLoggedIn() {
  const u = getUser();
  const t = getToken();
  if (AUTH_MODE === "demo") return Boolean(u?._id || u?.id);
  return Boolean(t);
}

export function logout() {
  localStorage.removeItem("auth:token");
  localStorage.removeItem("auth:user");
}

/**
 * คืน headers Authorization ให้ตรงกับโหมด
 * ใช้ร่วมกับ headers อื่น ๆ ได้ เช่น:
 * fetch(url, { headers: { ...authHeaders(), "Content-Type": "application/json" } })
 */
export function authHeaders(extra = {}) {
  if (AUTH_MODE === "demo") {
    const u = getUser();
    const uid = u?._id || u?.id;
    return { Authorization: `Bearer ${uid || ""}`, ...extra };
  } else {
    const t = getToken();
    return { Authorization: `Bearer ${t || ""}`, ...extra };
  }
}
