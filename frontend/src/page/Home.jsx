import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

//56
const heroImages = [
  "/image/B1.jpg",
  "/image/B2.jpg",
  "/image/B3.jpg",
];

const images = [
  "/image/B1.jpg",
  "/image/B2.jpg",
  "/image/B3.jpg",
  "/image/B4.jpg",
  "/image/B5.jpg",
  "/image/B6.jpg",
  "/image/B7.jpg",
];

export default function Home() {
    
    const [user, setUser] = useState(null);
    const [current, setCurrent] = useState(0); //56

    useEffect(() => {
        // ดึงข้อมูล user จาก localStorage
        const savedUser = localStorage.getItem("auth:user");
        if (savedUser) {
        try {
            setUser(JSON.parse(savedUser));
        } catch {
            setUser(null);
        }
        }
    }, []);

      // Simple slider next/prev 56
  const nextSlide = () => setCurrent((prev) => (prev + 1) % heroImages.length);
  const prevSlide = () =>
    setCurrent((prev) => (prev - 1 + heroImages.length) % heroImages.length);

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh" }}>
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "white", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", }} >
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", }} >

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img src="/image/logo.png" alt="Logo" style={{ width: "100px", borderRadius: "8px" }}/>
            </div>

            <nav style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                {user ? (
                    <Link to="/profile"
                        style={{ padding: "10px 20px", borderRadius: "8px", background: "#10b981", color: "white", fontWeight: "600",
                                textDecoration: "none", transition: "0.3s", boxShadow: "0 4px 8px rgba(16,185,129,0.3)", }}
                        onMouseOver={(e) => (e.target.style.background = "#059669") }
                        onMouseOut={(e) => (e.target.style.background = "#10b981") } >
                        {user.name || user.email} {/* แสดงชื่อ หรือถ้าไม่มีใช้ email */}
                    </Link>
                    ) : (
                    <Link to="/login" 
                        style={{ padding: "10px 20px", borderRadius: "8px", background: "#10b981", color: "white", fontWeight: "600", 
                                textDecoration: "none", transition: "0.3s", boxShadow: "0 4px 8px rgba(16,185,129,0.3)", }}
                        onMouseOver={(e) => (e.target.style.background = "#059669") }
                        onMouseOut={(e) => (e.target.style.background = "#10b981") }>
                        Login
                    </Link>
                )}
            </nav> 
        </div>
    </header>

    {/* Hero Section 56 */}
      <section style={{
          position: "relative",
          width: "100%",
          height: "80vh",
          overflow: "hidden",
        }}
      >
        <img
          src={heroImages[current]}
          alt="Hero"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.6)",
            transition: "0.5s",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "1.2rem", marginBottom: "10px" }}>
            สนามมาตรฐาน ตีมันส์ทุกแมตช์
          </p>
          <h1
            style={{
              fontSize: "4rem",
              fontWeight: "800",
              marginBottom: "20px",
              textShadow: "2px 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            Game On
          </h1>
          <Link
            to="/details"
            style={{
              padding: "12px 30px",
              background: "#10b981",
              color: "white",
              borderRadius: "8px",
              fontWeight: "600",
              textDecoration: "none",
              transition: "0.3s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#059669")}
            onMouseOut={(e) => (e.target.style.background = "#10b981")}
          >
            จองคอร์ต →
          </Link>
        </div>

        {/* Slider Controls 56 */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            onClick={prevSlide}
            style={{
              background: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
            }}
          >
            ‹
          </button>
          <button
            onClick={nextSlide}
            style={{
              background: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
            }}
          >
            ›
          </button>
        </div>
      </section>


    <main className="container" style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 20px" }}><br/>

        <section style={{ marginTop: "60px", background: "#ffffff", borderRadius: "16px",padding: "30px", 
                          marginBottom: "40px", boxShadow: "0 6px 16px rgba(0,0,0,0.08)",}} >
            <h1 style={{ textAlign: "center", margin: "30px 0", fontSize: "2rem", fontWeight: "700", color: "#064e3b" }}> 🏸 ภาพสนาม </h1><br/>
            <div style={{ display: "flex", overflowX: "auto", gap: "20px", paddingBottom: "15px", borderBottom: "2px solid #e5e7eb",}}>
                {images.map((img, i) => (
                <img key={i} src={img} alt={`สนามแบด ${i + 1}`}
                    style={{ height: "220px", borderRadius: "16px", boxShadow: "0 6px 16px rgba(0,0,0,0.15)", transition: "transform 0.3s", cursor: "pointer", }}
                            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}/> ))}
            </div><br/><br/>
        </section>

        <section style={{ marginTop: "60px", background: "#ffffff", borderRadius: "16px",padding: "30px", 
                          marginBottom: "40px", boxShadow: "0 6px 16px rgba(0,0,0,0.08)",}} >

            <h2 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "20px", color: "#065f46" }}>💰 อัตราค่าบริการ</h2><br/><br/>
            
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "20px" }} >
                    <thead style={{ background: "#d1fae5" }}>
                    <tr>
                        <th style={{ padding: "14px", textAlign: "left" }}>ประเภทบริการ</th>
                        <th style={{ padding: "14px", textAlign: "center" }}>วันธรรมดา (จ.–ศ.)</th>
                        <th style={{ padding: "14px", textAlign: "center" }}>วันหยุด (ส.–อา./นักขัตฤกษ์)</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td style={{ padding: "12px" }}>คอร์ตเดี่ยว (ต่อชั่วโมง)</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>120 บาท</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>150 บาท</td>
                    </tr>
                    <tr style={{ background: "#f9fafb" }}>
                        <td style={{ padding: "12px" }}>คูปอง 10 ชั่วโมง</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>1,100 บาท</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>1,300 บาท</td>
                    </tr>
                    <tr>
                        <td style={{ padding: "12px" }}>เช่ารองเท้า</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>20 บาท/คู่</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>20 บาท/คู่</td>
                    </tr>
                    <tr style={{ background: "#f9fafb" }}>
                        <td style={{ padding: "12px" }}>เช่าไม้แบด</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>50 บาท/ไม้</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>50 บาท/ไม้</td>
                    </tr>
                    <tr>
                        <td style={{ padding: "12px" }}>ลูกขนไก่</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>เริ่มต้น 100 บาท</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>เริ่มต้น 100 บาท</td>
                    </tr>
                    </tbody>
                </table>
            </div><br/><br/>
        </section>

        <section style={{ marginTop: "60px", background: "#ffffff", borderRadius: "16px",padding: "30px", 
                          marginBottom: "40px", boxShadow: "0 6px 16px rgba(0,0,0,0.08)",}} >
            <h2 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "20px", color: "#065f46" }}> 📝 เงื่อนไขการใช้สนาม </h2><br/>
            <ul style={{ lineHeight: "1.8", color: "#374151", paddingLeft: "20px", fontSize: "20px", listStylePosition: "inside" }}>
                <li>เปิดทุกวัน 09:00 – 21:00</li>
                <li>มาสายเกิน 15 นาที สิทธิ์จะถูกตัด</li>
                <li>ต้องใส่รองเท้าแบดมินตัน</li>
                <li>ห้ามนำอาหารและเครื่องดื่ม</li>
            </ul><br/>
        </section>

        <section style={{ marginTop: "60px", background: "#ffffff", borderRadius: "16px", padding: "30px", 
                          marginBottom: "40px", boxShadow: "0 6px 16px rgba(0,0,0,0.08)",}} >
            <h2 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "20px", color: "#065f46" }}> 📞 ติดต่อเรา </h2><br/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "center", fontSize: "20px"}} >
                <div>
                    <p style={{ margin: "6px 0" }}>โทร: <b>081-234-5678</b></p>
                    <p style={{ margin: "6px 0" }}>ไลน์: <b>@universebad</b></p>
                    <p style={{ margin: "6px 0" }}>ที่อยู่: 123 ถนนสปอร์ต ซิตี้</p>
                    <p style={{ margin: "6px 0", color: "#6b7280" }}>เปิดทุกวัน 09:00 – 21:00</p>
                </div>
                <iframe src="https://www.google.com/maps/embed?pb=!1m18..." width="100%" height="250"
                        style={{ border: 0, borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }} title="map">
                </iframe>
            </div><br/><br/>
        </section>
    </main>

    <footer style={{ background: "#064e3b", color: "white", textAlign: "center", padding: "30px 20px", marginTop: "60px", fontSize: "1.2rem", fontWeight: "500",  letterSpacing: "0.5px",}} >
        © 2025 Universe Badminton. All rights reserved.
      </footer>
    </div>
  );
}
