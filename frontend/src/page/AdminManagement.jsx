import React, { useEffect, useState } from "react";

const API = "https://badminton-hzwm.onrender.com";

export default function AdminManagement() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth:token");
    if (!token) {
      setMessage("❌ Unauthorized: กรุณา login เป็น admin");
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [userRes, bookingRes] = await Promise.all([
          fetch(`${API}/api/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/admin/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!userRes.ok || !bookingRes.ok) {
          throw new Error("โหลดข้อมูลไม่สำเร็จ");
        }

        const usersData = await userRes.json();
        const bookingsData = await bookingRes.json();

        setUsers(usersData);
        setBookings(bookingsData);
      } catch (err) {
        setMessage(`❌ Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <p className="p-4">⏳ กำลังโหลดข้อมูล...</p>;
  if (message) return <p className="p-4 text-red-500">{message}</p>;

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">📊 Admin Management</h1>

      {/* Users Table */}
      <div>
        <h2 className="text-xl font-semibold mb-2">👤 Users</h2>
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-3 py-2 border">Name</th>
              <th className="px-3 py-2 border">Email</th>
              <th className="px-3 py-2 border">Phone</th>
              <th className="px-3 py-2 border">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-gray-100">
                <td className="px-3 py-2 border">{u.name}</td>
                <td className="px-3 py-2 border">{u.email}</td>
                <td className="px-3 py-2 border">{u.phone}</td>
                <td className="px-3 py-2 border">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bookings Table */}
      <div>
        <h2 className="text-xl font-semibold mb-2">🏸 All Bookings</h2>
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-3 py-2 border">User</th>
              <th className="px-3 py-2 border">Email</th>
              <th className="px-3 py-2 border">Date</th>
              <th className="px-3 py-2 border">Court</th>
              <th className="px-3 py-2 border">Hour</th>
              <th className="px-3 py-2 border">Note</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} className="hover:bg-gray-100">
                <td className="px-3 py-2 border">{b.user?.name}</td>
                <td className="px-3 py-2 border">{b.user?.email}</td>
                <td className="px-3 py-2 border">{b.date}</td>
                <td className="px-3 py-2 border">{b.court}</td>
                <td className="px-3 py-2 border">
                  {b.hour}:00 - {b.hour + 1}:00
                </td>
                <td className="px-3 py-2 border">{b.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
