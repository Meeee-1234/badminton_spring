// src/main/java/com/badminton/backend/service/UserService.java
package com.badminton.backend.service;

import com.badminton.backend.model.User;
import com.badminton.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepo;

    public UserService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    /** ดึงเฉพาะผู้ใช้ที่ยังไม่ถูกลบ (Active) */
    public List<User> findAll() {
        return userRepo.findByDeletedFalse();
    }

    /** ดึงทั้งหมด (รวมที่ถูกลบแล้ว) */
    public List<User> findAllIncludingDeleted() {
        return userRepo.findAll();
    }

    /** ใช้กรณีต้องการสวิตช์รวม/ไม่รวมที่ลบแล้วจาก Controller */
    public List<User> listUsers(boolean includeDeleted) {
        return includeDeleted ? userRepo.findAll() : userRepo.findByDeletedFalse();
    }

    public Optional<User> findById(String id) {
        return userRepo.findById(id);
    }

    /** Soft delete: ตั้ง deleted=true */
    public void setDeletedFlag(String id, boolean deleted) {
        User u = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        u.setDeleted(deleted);
        userRepo.save(u);
    }

    /** ลบแบบ soft (คง method เดิมไว้แต่พฤติกรรมเป็น soft delete) */
    public boolean deleteById(String id) {
        if (!userRepo.existsById(id)) return false;
        setDeletedFlag(id, true);
        return true;
    }

    /** กู้คืนผู้ใช้ที่ถูกลบ (deleted=false) */
    public boolean restoreById(String id) {
        if (!userRepo.existsById(id)) return false;
        setDeletedFlag(id, false);
        return true;
    }

    /** (ออปชัน) ลบจริงจากฐานข้อมูล — ใช้เฉพาะงานดูแลระบบเท่านั้น */
    public boolean hardDeleteById(String id) {
        if (!userRepo.existsById(id)) return false;
        userRepo.deleteById(id);
        return true;
    }
}
