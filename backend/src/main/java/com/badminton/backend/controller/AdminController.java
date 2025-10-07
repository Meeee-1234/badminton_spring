package com.badminton.backend.controller;

import com.badminton.backend.model.Booking;
import com.badminton.backend.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private BookingRepository bookingRepo;

    // ✅ ดึง booking ตามวัน (admin เท่านั้น)
    @GetMapping("/bookings/date")
    public ResponseEntity<?> listByDate(@RequestParam String date) {
        System.out.println("🔍 Admin ดู booking ในวันที่ = " + date);

        List<Booking> bookings = bookingRepo.findByDate(date);

        List<Map<String, Object>> result = bookings.stream().map(b -> Map.of(
                "_id", b.getId(),
                "user", Map.of(
                        "_id", b.getUser().getId(),
                        "name", b.getUser().getName()
                ),
                "date", b.getDate(),
                "court", b.getCourt(),
                "hour", b.getHour(),
                "status", b.getStatus()
        )).toList();

        return ResponseEntity.ok(Map.of("bookings", result));
    }

    @GetMapping("/bookings")
public ResponseEntity<?> getAllBookings(@RequestParam(required = false) String date) {
    List<Booking> bookings;

    if (date != null && !date.isBlank()) {
        bookings = bookingRepo.findByDate(date);
    } else {
        bookings = bookingRepo.findAll();
    }

    List<Map<String, Object>> result = bookings.stream().map(b -> Map.of(
        "_id", b.getId(),
        "user", Map.of(
            "_id", b.getUser().getId(),
            "name", b.getUser().getName()
        ),
        "date", b.getDate(),
        "court", b.getCourt(),
        "hour", b.getHour(),
        "status", b.getStatus()
    )).toList();

    return ResponseEntity.ok(Map.of("bookings", result));
}

}
