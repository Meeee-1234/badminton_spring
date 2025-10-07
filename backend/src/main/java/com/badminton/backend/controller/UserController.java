package com.badminton.backend.controller;

import com.badminton.backend.model.User;
import com.badminton.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepo;

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
}
