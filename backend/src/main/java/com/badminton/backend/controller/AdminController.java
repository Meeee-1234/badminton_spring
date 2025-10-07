package com.badminton.backend.controller;

import com.badminton.backend.model.User;
import com.badminton.backend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private UserRepository userRepo;

    // ✅ ดึงผู้ใช้ทั้งหมด
    @GetMapping("")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepo.findAll();
        return ResponseEntity.ok(Map.of("users", users));
    }

    // ✅ ลบผู้ใช้ตาม id
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        if (!userRepo.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of("error", "ไม่พบผู้ใช้"));
        }
        userRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "ลบผู้ใช้เรียบร้อยแล้ว"));
    }
}
