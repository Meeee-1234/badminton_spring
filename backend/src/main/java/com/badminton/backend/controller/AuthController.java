package com.badminton.backend.controller;

import com.badminton.backend.model.User;
import com.badminton.backend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;   // ✅ สำคัญ: ต้องมี
import java.util.HashMap;   // ✅ ใช้ตอนสร้าง payload
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
        if (user == null || user.getEmail() == null || user.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "ข้อมูลไม่ครบ"));
        }
        if (userRepo.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "อีเมลนี้ถูกใช้งานแล้ว"));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null || user.getRole().isBlank()) user.setRole("user");
        // ถ้าใช้ soft delete ให้ตั้งค่าเริ่มต้น
        if (user.getDeleted() == null) user.setDeleted(false);

        userRepo.save(user);
        return ResponseEntity.ok(Map.of("message", "สมัครสมาชิกสำเร็จ"));
    }

    @PostMapping("/login")
public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
    String email = body.get("email");
    String password = body.get("password");

    if (email == null || password == null) {
        return ResponseEntity.badRequest().body(Map.of("error", "อีเมล/รหัสผ่านไม่ครบ"));
    }

    // ✅ ดึงเฉพาะผู้ใช้ที่ยังไม่ถูกลบเท่านั้น
    Optional<User> opt = userRepo.findByEmailIgnoreCaseAndDeletedFalse(email);
    if (opt.isEmpty()) {
        return ResponseEntity.status(403).body(Map.of("error", "บัญชีนี้ถูกลบหรือไม่มีอยู่ในระบบ"));
    }

    User user = opt.get();

    // ✅ ตรวจรหัสผ่าน
    if (!passwordEncoder.matches(password, user.getPassword())) {
        return ResponseEntity.status(401).body(Map.of("error", "รหัสผ่านไม่ถูกต้อง"));
    }

    // ✅ สร้าง token (ตัวอย่าง)
    String token = UUID.randomUUID().toString();

    Map<String, Object> userData = new HashMap<>();
    userData.put("_id", user.getId());
    userData.put("name", user.getName());
    userData.put("email", user.getEmail());
    userData.put("role", user.getRole());

    return ResponseEntity.ok(Map.of(
            "token", token,
            "user", userData,
            "message", "เข้าสู่ระบบสำเร็จ"
    ));
}

}
