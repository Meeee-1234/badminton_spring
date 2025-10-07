package com.badminton.backend.service;

import java.util.*;
import org.springframework.stereotype.Service;
import com.badminton.backend.dto.UserDto;

@Service
public class UserService {

    // ตัวอย่างจำลองฐานข้อมูล
    private final List<UserDto> fakeDB = new ArrayList<>();

    public UserService() {
        fakeDB.add(new UserDto("1", "Admin User", "admin@example.com", "0800000000", "ADMIN"));
        fakeDB.add(new UserDto("2", "Player One", "user1@example.com", "0811111111", "USER"));
        fakeDB.add(new UserDto("3", "Player Two", "user2@example.com", "0822222222", "USER"));
    }

    // ✅ ดึงผู้ใช้ทั้งหมด
    public List<UserDto> findAll() {
        return fakeDB;
    }

    // ✅ ลบผู้ใช้ตาม ID
    public void deleteById(String id) {
        fakeDB.removeIf(u -> u.getId().equals(id));
    }
}
