package com.badminton.backend.controller;

import com.badminton.backend.model.User;
import com.badminton.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepo;



    // ✅ ดึงผู้ใช้ทั้งหมด
    @GetMapping("")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepo.findAll();
        return ResponseEntity.ok(Map.of("users", users));
    }




    

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepo.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body(new HashMap<>() {{
                put("error", "อีเมลนี้ถูกใช้งานแล้ว");
            }});
        }

        User saved = userRepo.save(user);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        return userRepo.findById(id)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(user))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "ไม่พบผู้ใช้")));
    }

    @PatchMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody Map<String, Object> updates) {
        try {
            Optional<User> optionalUser = userRepo.findById(id);
            if (optionalUser.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "ไม่พบผู้ใช้"));
            }

            User user = optionalUser.get();

            if (updates.containsKey("name")) {
                user.setName((String) updates.get("name"));
            }
            if (updates.containsKey("phone")) {
                user.setPhone((String) updates.get("phone"));
            }

            User savedUser = userRepo.save(user);

            // ✅ แก้ตรงนี้ ไม่ return user ตรง ๆ
            Map<String, Object> userResponse = new HashMap<>();
            userResponse.put("id", savedUser.getId());
            userResponse.put("name", savedUser.getName());
            userResponse.put("email", savedUser.getEmail());
            userResponse.put("phone", savedUser.getPhone());
            userResponse.put("role", savedUser.getRole()); // ✅ ไม่ใส่ password

            return ResponseEntity.ok(Map.of("message", "อัปเดตข้อมูลเรียบร้อยแล้ว", "user", userResponse));

        } catch (Exception e) {
            e.printStackTrace(); // ✅ log error ไว้
            return ResponseEntity.status(500).body(Map.of("error", "Server error", "detail", e.getMessage()));
        }
    }



}
