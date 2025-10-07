package com.badminton.backend.controller;

import com.badminton.backend.controller.dto.AdminBookingItem;
import com.badminton.backend.controller.dto.UpdateStatusRequest;
import com.badminton.backend.model.Booking;
import com.badminton.backend.repository.BookingRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/bookings")
@CrossOrigin(origins = "*")
public class AdminBookingController {

    @Autowired
    private BookingRepository bookingRepo;

    // ✅ แปลงสถานะที่มาจาก frontend ให้เป็นค่ามาตรฐานในระบบ
    private String normalizeStatus(String raw) {
        String v = String.valueOf(raw == null ? "" : raw).trim().toLowerCase();
        if (v.equals("checked_in") || v.equals("arrived")) return "arrived";
        if (v.equals("canceled") || v.equals("cancelled")) return "canceled";
        if (v.equals("booked")) return "booked";
        return "booked";
    }

    private AdminBookingItem toAdminItem(Booking b) {
        String userName = (b.getUser() != null && b.getUser().getName() != null) ? b.getUser().getName() : "-";
        return new AdminBookingItem(
                b.getId(),
                b.getDate(),
                b.getCourt(),
                b.getHour(),
                b.getStatus(),
                userName,
                b.getNote() == null ? "" : b.getNote()
        );
    }

    /** ✅ GET /api/admin/bookings?date=YYYY-MM-DD
     * คืน { "bookings": [ ... ] }
     */
    @GetMapping("")
    public ResponseEntity<?> listByDate(@RequestParam String date) {
        if (date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return ResponseEntity.badRequest().body(Map.of("error", "ต้องส่ง date รูปแบบ YYYY-MM-DD"));
        }

        // ดึงทั้งหมด (รวม canceled) และเรียงเพื่อให้ UI แสดงสวยงาม
        List<Booking> list = bookingRepo.findByDateOrderByCourtAscHourAsc(date);
        if (list == null) list = bookingRepo.findByDate(date);

        List<AdminBookingItem> items = list.stream()
                .map(this::toAdminItem)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("bookings", items));
    }

    /** ✅ PUT /api/admin/bookings/{id}/status
     * body: { "status": "checked_in" | "arrived" | "booked" | "canceled" }
     * คืน { message, booking }
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody UpdateStatusRequest req) {
        try {
            Optional<Booking> opt = bookingRepo.findById(id);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "ไม่พบรายการจอง"));
            }
            Booking b = opt.get();

            String newStatus = normalizeStatus(req.getStatus());
            b.setStatus(newStatus);
            Booking saved = bookingRepo.save(b);

            return ResponseEntity.ok(Map.of(
                    "message", "อัพเดตสถานะสำเร็จ",
                    "booking", toAdminItem(saved)
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Server error", "detail", e.getMessage()));
        }
    }
}
