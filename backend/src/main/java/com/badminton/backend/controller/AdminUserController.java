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
public class AdminUserController {

    @Autowired
    private UserRepository userRepo;

    @GetMapping("")
    public ResponseEntity<List<User>> listUsers() {
        List<User> users = userRepo.findByRoleIgnoreCase("user")
                                .stream()
                                .filter(u -> !u.isDeleted())
                                .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        Optional<User> optional = userRepo.findById(id);
        if (optional.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "ไม่พบผู้ใช้"));
        }
        return ResponseEntity.ok(optional.get());
    }



    @DeleteMapping("/{id}")
        public ResponseEntity<?> softDeleteUser(@PathVariable String id) {
            Optional<User> opt = userRepo.findById(id);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "ไม่พบผู้ใช้"));
            }

            User user = opt.get();
            user.setDeleted(true); // ✅ mark ลบ
            userRepo.save(user);

            return ResponseEntity.ok(Map.of("message", "ปิดการใช้งานผู้ใช้เรียบร้อย"));
        }

    @GetMapping("/deleted")
    public ResponseEntity<?> getDeletedUsers() {
        List<User> deletedUsers = userRepo.findAll()
                                        .stream()
                                        .filter(User::isDeleted)
                                        .toList();
        return ResponseEntity.ok(deletedUsers);
    }

}
