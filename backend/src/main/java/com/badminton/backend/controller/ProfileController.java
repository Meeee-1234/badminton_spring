package com.badminton.backend.controller;


import com.badminton.backend.model.Profile;
import com.badminton.backend.model.User;
import com.badminton.backend.repository.ProfileRepository;
import com.badminton.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.HashMap;
import java.util.Map;


@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "*")
public class ProfileController {


@Autowired
private ProfileRepository profileRepo;


@Autowired
private UserRepository userRepo;


@PostMapping("/{userId}")
public ResponseEntity<?> updateProfile(@PathVariable String userId, @RequestBody Map<String, String> payload) {
User user = userRepo.findById(userId).orElse(null);
if (user == null) {
return ResponseEntity.status(404).body(Map.of("error", "ไม่พบผู้ใช้"));
}


Profile profile = profileRepo.findByUser(user).orElse(new Profile());
profile.setUser(user);
profile.setEmergencyName(payload.getOrDefault("emergencyName", ""));
profile.setEmergencyPhone(payload.getOrDefault("emergencyPhone", ""));
profileRepo.save(profile);


return ResponseEntity.ok(Map.of("message", "อัพเดตโปรไฟล์เรียบร้อย", "profile", profile));
}


@GetMapping("/{userId}")
public ResponseEntity<?> getProfile(@PathVariable String userId) {
User user = userRepo.findById(userId).orElse(null);
if (user == null) {
return ResponseEntity.status(404).body(Map.of("error", "ไม่พบผู้ใช้"));
}


Profile profile = profileRepo.findByUser(user).orElse(null);
if (profile == null) {
return ResponseEntity.status(404).body(Map.of("error", "ไม่พบโปรไฟล์"));
}


return ResponseEntity.ok(profile);
}
}