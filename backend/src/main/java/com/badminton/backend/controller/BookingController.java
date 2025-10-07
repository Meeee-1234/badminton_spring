package com.badminton.backend.controller;

import com.badminton.backend.controller.dto.CreateBookingRequest;
import com.badminton.backend.model.Booking;
import com.badminton.backend.service.BookingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

  private final BookingService bookingService;

  public BookingController(BookingService bookingService) {
    this.bookingService = bookingService;
  }

  // ===== Helper: ดึง userId จาก Authorization: Bearer <userId> (เดโม่)
  private String extractUserId(HttpServletRequest req) {
    String auth = req.getHeader("Authorization");
    if (auth != null && auth.startsWith("Bearer ")) {
      return auth.substring(7).trim(); // ใช้เป็น userId ตรง ๆ
    }
    return null;
  }

  // GET /api/bookings/taken?date=YYYY-MM-DD
  @GetMapping("/taken")
  public Map<String, Object> getTaken(@RequestParam("date") String dateKey) {
    List<Booking> list = bookingService.getByDate(dateKey);
    // frontend ต้องการ [{key:"c:h", status:"booked|arrived"}]
    List<Map<String, String>> taken = list.stream().map(b -> {
      Map<String, String> m = new HashMap<>();
      m.put("key", b.getCourt() + ":" + b.getHour());
      m.put("status", b.getStatus());
      return m;
    }).toList();

    Map<String, Object> out = new HashMap<>();
    out.put("taken", taken);
    return out;
  }

  // GET /api/bookings/my/{userId}/{date}
  @GetMapping("/my/{userId}/{date}")
  public Map<String, Object> getMine(@PathVariable String userId, @PathVariable String date) {
    List<Booking> list = bookingService.getMineByDate(date, userId);
    List<String> mine = list.stream()
        .map(b -> b.getCourt() + ":" + b.getHour())
        .collect(Collectors.toList());
    Map<String, Object> out = new HashMap<>();
    out.put("mine", mine);
    return out;
  }

  // POST /api/bookings
  @PostMapping
  public ResponseEntity<?> create(@Valid @RequestBody CreateBookingRequest reqBody, HttpServletRequest req) {
    String userId = extractUserId(req);
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.status(401).body(Map.of("error", "missing or invalid token (need Bearer <userId> for demo)"));
    }

    try {
      Booking saved = bookingService.createBooked(
          reqBody.getDate(), reqBody.getCourt(), reqBody.getHour(), userId, reqBody.getNote()
      );
      Map<String, Object> out = new HashMap<>();
      out.put("id", saved.getId());
      out.put("status", saved.getStatus());
      out.put("date", saved.getDateKey());
      out.put("court", saved.getCourt());
      out.put("hour", saved.getHour());
      return ResponseEntity.ok(out);
    } catch (IllegalStateException e) {
      return ResponseEntity.status(409).body(Map.of("error", "slot already taken"));
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body(Map.of("error", "server error"));
    }
  }
}
