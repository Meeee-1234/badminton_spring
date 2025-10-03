
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

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
  const [selectedImage, setSelectedImage] = useState(null); // popup image

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

  // Simple slider next/prev
  const nextSlide = () => setCurrent((prev) => (prev + 1) % heroImages.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + heroImages.length) % heroImages.length);

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "white", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", }} >
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", }} >

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/image/logo.png" alt="Logo" style={{ width: "100px", borderRadius: "8px" }}/>
          </div>

          {/* Login & Username */}
          <nav style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            {user ? (
              <Link to={user.role === "admin" ? "/AdminManagement" : "/profile"} 
                style={{ padding: "10px 20px", borderRadius: "8px", background: "#10b981", color: "white", fontWeight: "600", fontSize: "20px", textDecoration: "none", transition: "0.3s", boxShadow: "0 4px 8px rgba(16,185,129,0.3)", }}
                        onMouseOver={(e) => (e.target.style.background = "#059669")}
                        onMouseOut={(e) => (e.target.style.background = "#10b981")}> {user.name || user.email}{" "} </Link>
                      ) : (
              <Link to="/login" 
                style={{ padding: "10px 20px", borderRadius: "8px", background: "#10b981", color: "white", fontWeight: "600", fontSize: "20px", textDecoration: "none", transition: "0.3s", boxShadow: "0 4px 8px rgba(16,185,129,0.3)", }}
                        onMouseOver={(e) => (e.target.style.background = "#059669") }
                        onMouseOut={(e) => (e.target.style.background = "#10b981") }> Login </Link> )}
          </nav> 
          </div>
      </header>

      {/* Game On */}
        <section style={{ position: "relative", width: "100%", height: "80vh", overflow: "hidden", }} >
          <img src={heroImages[current]} alt="Hero"
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.6)", transition: "0.5s", }} />
          
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "white", textAlign: "center", }} >
            <p style={{ fontSize: "25px", marginBottom: "10px" }}> สนามมาตรฐาน ตีมันส์ทุกแมตช์ </p>
            <h1 style={{ fontSize: "50px", fontWeight: "800", marginBottom: "20px", textShadow: "2px 2px 8px rgba(0,0,0,0.5)", }} >
              Game On
            </h1><br/>
            
            {user ? (
              <Link to={user.role === "admin" ? "/admindetails" : "/details"}
                    style={{ fontSize: "20px", padding: "12px 30px", background: "#10b981",color: "white",borderRadius: "8px",fontWeight: "600", textDecoration: "none",transition: "0.3s", }}
                            onMouseOver={(e) => (e.target.style.background = "#059669")}
                            onMouseOut={(e) => (e.target.style.background = "#10b981")}>
                จองคอร์ต →
              </Link>
            ) : (
              <Link to="/details" 
                    style={{ fontSize: "20px", padding: "12px 30px", background: "#10b981", color: "white", borderRadius: "8px", fontWeight: "600",textDecoration: "none",transition: "0.3s", }}
                            onMouseOver={(e) => (e.target.style.background = "#059669")}
                            onMouseOut={(e) => (e.target.style.background = "#10b981")} > 
                จองคอร์ต → 
                </Link>
            )}

          </div>

          {/* Slider Controls */}
          <div style={{position: "absolute",bottom: "20px",left: "50%",transform: "translateX(-50%)", display: "flex",gap: "10px", }}>
            <button onClick={prevSlide} style={{ background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer",}} > ‹ </button>
            <button onClick={nextSlide} style={{ background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer", }} >  › </button>
          </div>
        </section>


      <main className="container" style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 20px" }}><br/>
          {/* ภาพสนาม */}
          <section style={{ marginTop: "60px", background: "#ffffff", borderRadius: "16px", padding: "30px", marginBottom: "40px", boxShadow: "0 6px 16px rgba(0,0,0,0.08)", }}>
            <h1 style={{ textAlign: "center", margin: "30px 0", fontSize: "2rem", fontWeight: "700", color: "#064e3b" }}> 
              🏸 ภาพสนาม 
            </h1><br/>

            <div style={{ display: "flex", overflowX: "auto", gap: "20px", paddingBottom: "15px", borderBottom: "2px solid #e5e7eb", }}>
              {images.map((img, i) => (
                <img key={i} src={img} alt={`สนามแบด ${i + 1}`} 
                    style={{ height: "220px", borderRadius: "16px", boxShadow: "0 6px 16px rgba(0,0,0,0.15)", transition: "transform 0.3s", cursor: "pointer" }}
                              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                              onClick={() => setSelectedImage(img)} /> ))}
            </div><br/><br/>
          </section>
          
          {/* อัตราค่าบริการ */}
          <section style={{ marginTop: "60px", background: "#ffffff", borderRadius: "16px",padding: "30px",  marginBottom: "40px", boxShadow: "0 6px 16px rgba(0,0,0,0.08)",}} >
            <h2 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "20px", color: "#065f46" }}>
              💰 อัตราค่าบริการ
            </h2><br/><br/>

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

          {/* เงื่อนไขการใช้สนาม */}
          <section style={{ marginTop: "60px", background: "#ffffff", borderRadius: "16px",padding: "30px", marginBottom: "40px", boxShadow: "0 6px 16px rgba(0,0,0,0.08)",}} >
            <h2 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "20px", color: "#065f46" }}> 
              📝 เงื่อนไขการใช้สนาม
            </h2><br/>

            <ul style={{ lineHeight: "1.8", color: "#374151", paddingLeft: "20px", fontSize: "20px", listStylePosition: "inside" }}>
              <p style={{fontWeight: "600", fontSize: "30px"}}>เวลาเปิด–ปิด</p>
              <li>เปิดให้บริการทุกวัน เวลา 09:00 – 21:00 น.</li>
              <li>กรุณาออกจากสนามภายในเวลา 22.00 น.</li>

              <p style={{fontWeight: "600", fontSize: "30px"}}>การจองสนาม</p>
              <li>เปิดให้บริการทุกวัน เวลา 09:00 – 21:00 น.</li>
              <li>จองล่วงหน้าได้</li>
              <li>ต้องมาก่อนเวลาที่จอง 10-15 นาที เพื่อชำระเงินในการจอง</li>
              <li>หากมาสายเกิน 15 นาที สิทธิ์การจองจะถูกตัดและให้ผู้เล่นท่านอื่นใช้แทน</li>
              <li>หากต้องการยกเลิกการจองต้องโทรมาแจ้งอย่างน้อย 1 ชั่วโมง</li>

              <p style={{fontWeight: "600", fontSize: "30px"}}>การแต่งกายและอุปกรณ์</p>
              <li>ต้องใส่รองเท้าแบดมินตัน หากไม่มีรองเท้า ทางสนามมีบริการเช่ารองเท้า ค่าบริการ 20 บาท/คู่</li>
              <li>ห้ามนำรองเท้าที่เปียก หรือสกปรกเข้ามาในสนาม</li>
              <li>ผู้เล่นต้องเตรียมไม้แบด และลูกขนไก่มาเอง หากลูกค้าไม่มีไม้แบด ทางสนามมีบริการเช่าไม้แบด 50 บาท/ไม้ ส่วนลูกขนไก่มีวางจำหน่ายให้หลายราคา และหลายแบบ</li>
                  
              <p style={{fontWeight: "600", fontSize: "30px"}}>มารยาทการในใช้สนาม</p>
              <li>ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) เข้ามาในสนาม</li>
              <li>ห้ามสูบบุหรี่ หรือดื่มแอลกอฮอล์ในพื้นที่สนาม</li>
              <li>กรุณาเก็บขยะ และอุปกรณ์ส่วนตัวหลังใช้งานทุกครั้ง</li>
                  
              <p style={{fontWeight: "600", fontSize: "30px"}}>ความปลอดภัย</p>
              <li>หากมีอาการบาดเจ็บ กรุณาแจ้งเจ้าหน้าที่ทันที</li>
              <li>ผู้เล่นต้องรับผิดชอบต่อทรัพย์สินส่วนตัว และอุปกรณ์ที่นำมาใช้เอง</li>
            </ul><br/>
          </section>

          {/* ติดต่อเรา */}
          <section style={{ marginTop: "60px", background: "#ffffff", borderRadius: "16px", padding: "30px", marginBottom: "40px", boxShadow: "0 6px 16px rgba(0,0,0,0.08)",}} >
            <h2 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "20px", color: "#065f46" }}> 
              📞 ติดต่อเรา 
            </h2><br/>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "center", fontSize: "20px"}} >
              <div>
                <p style={{ margin: "6px 0" }}>โทร: <b>081-234-5678</b></p>
                <p style={{ margin: "6px 0" }}>ไลน์: <b>@universebad</b></p>
                <p style={{ margin: "6px 0" }}>ที่อยู่: 123 ถนนสปอร์ต ซิตี้</p>
                <p style={{ margin: "6px 0", color: "#6b7280" }}>เปิดทุกวัน 09:00 – 21:00</p>
              </div>
              
              <iframe src="https://www.google.com/maps/embed?pb=!1m18..." width="100%" height="250" style={{ border: 0, borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }} title="map" /> 
            </div><br/><br/>
          </section>
      </main>

      {/* Modal Popup */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)}  
            style={{ position: "fixed", top: 0, left: 0,  width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,  }} >
            
          <div style={{ position: "relative" }}>
          <img src={selectedImage}  alt="full" 
              style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: "12px", boxShadow: "0 8px 20px rgba(0,0,0,0.5)" }} />
                
          <button onClick={() => setSelectedImage(null)}
                  style={{ position: "absolute", top: "-40px", right: "-40px",background: "white", border: "none", borderRadius: "50%", width: "40px", height: "40px",fontSize: "20px", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }} > 
            ✕  
          </button>
          </div>
        </div>
        )}

      {/* Footer */}
      <footer style={{ background: "#064e3b", color: "white", textAlign: "center", padding: "30px 20px", marginTop: "60px", fontSize: "1.2rem", fontWeight: "500",  letterSpacing: "0.5px",}} >
          © 2025 Universe Badminton. All rights reserved.
      </footer>
    </div>
  );
}
