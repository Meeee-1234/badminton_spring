package com.badminton.backend.controller;

import com.badminton.backend.model.User;
import com.badminton.backend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepo.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "อีเมลนี้ถูกใช้งานแล้ว"));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("user");
        userRepo.save(user);
        return ResponseEntity.ok(Map.of("message", "สมัครสมาชิกสำเร็จ"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        User user = userRepo.findByEmail(payload.get("email")).orElse(null);
        if (user == null || !passwordEncoder.matches(payload.get("password"), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
        }

        String fakeToken = UUID.randomUUID().toString();

        return ResponseEntity.ok(Map.of(
            "token", fakeToken,
            "user", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "phone", user.getPhone(),
                "role", user.getRole()
            )
        ));
    }
}
