package com.badminton.backend.controller;

import com.badminton.backend.model.Booking;
import com.badminton.backend.model.User;
import com.badminton.backend.repository.BookingRepository;
import com.badminton.backend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepo;

    @Autowired
    private UserRepository userRepo;

    // ✅ check สนามกับเวลาไหนที่ถูกจองไปแล้ว
    @GetMapping("/taken")
    public ResponseEntity<?> getTaken(@RequestParam String date) {
        if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return ResponseEntity.badRequest().body(Map.of("error", "ต้องส่ง date รูปแบบ YYYY-MM-DD"));
        }

        List<String> activeStatus = Arrays.asList("booked", "arrived");
        List<Booking> bookings = bookingRepo.findByDateAndStatusIn(date, activeStatus);

        List<Map<String, String>> taken = new ArrayList<>();
        for (Booking b : bookings) {
            taken.add(Map.of(
                "key", b.getCourt() + ":" + b.getHour(),
                "status", b.getStatus()
            ));
        }

        return ResponseEntity.ok(Map.of("taken", taken));
    }

    // ✅ ดึงการจองทั้งหมดของ user
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getBookingsByUser(@PathVariable String userId) {
        List<Booking> bookings = bookingRepo.findByUserId(userId);
        return ResponseEntity.ok(Map.of("bookings", bookings));
    }

    // ✅ ดูการจองของ user ตามวัน (ไม่เอาที่ถูกยกเลิก)
    @GetMapping("/my/{userId}/{date}")
    public ResponseEntity<?> getMyBookings(@PathVariable String userId, @PathVariable String date) {
        if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return ResponseEntity.badRequest().body(Map.of("error", "ต้องส่ง date รูปแบบ YYYY-MM-DD"));
        }

        List<String> allowed = Arrays.asList("booked", "arrived");
        List<Booking> myBookings = bookingRepo.findByUserIdAndDateAndStatusIn(userId, date, allowed);

        List<String> mine = new ArrayList<>();
        for (Booking b : myBookings) {
            mine.add(b.getCourt() + ":" + b.getHour());
        }

        return ResponseEntity.ok(Map.of("mine", mine));
    }

@PostMapping("")
public ResponseEntity<?> createBooking(@RequestBody Map<String, Object> req) {
    try {
        // รับค่าจาก req
        String userId = (String) req.get("userId");
        String date = (String) req.get("date");
        String note = req.getOrDefault("note", "").toString();

        // ⚠️ court กับ hour เป็น Number ต้อง cast แบบปลอดภัย
        int court = ((Number) req.get("court")).intValue();
        int hour = ((Number) req.get("hour")).intValue();

        if (userId == null || date == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "ข้อมูลไม่ครบ"));
        }

        // หา user จาก id
        Optional<User> userOpt = userRepo.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "ไม่พบผู้ใช้"));
        }

        // เช็กว่าซ้ำไหม
        List<String> activeStatus = Arrays.asList("booked", "arrived");
        Optional<Booking> exists = bookingRepo.findByDateAndCourtAndHourAndStatusIn(date, court, hour, activeStatus);
        if (exists.isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "ช่วงเวลานี้ถูกจองแล้ว"));
        }

        // สร้าง booking ใหม่
        Booking booking = new Booking(userOpt.get(), date, court, hour, "booked", note);
        Booking saved = bookingRepo.save(booking);

        return ResponseEntity.status(201).body(Map.of("message", "จองสำเร็จ", "booking", saved));
    } catch (Exception e) {
        e.printStackTrace(); // ✅ แสดง error บน console
        return ResponseEntity.status(500).body(Map.of("error", "Server error", "detail", e.getMessage()));
    }
}







// ✅ ดึงการจองทั้งหมด
@GetMapping("")
public ResponseEntity<?> getAllBookings() {
    List<Booking> bookings = bookingRepo.findAll();
    return ResponseEntity.ok(Map.of("bookings", bookings));
}


}
