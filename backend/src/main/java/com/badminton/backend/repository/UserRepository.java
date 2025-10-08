package com.badminton.backend.repository;

import com.badminton.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    boolean existsByEmail(String email);

    // 🔹 เพิ่ม IgnoreCase เพื่อให้ค้นหาอีเมลไม่สนตัวพิมพ์เล็กใหญ่
    Optional<User> findByEmailIgnoreCase(String email);

    // 🔹 (เพิ่มอีกตัวถ้าต้องการให้ตรวจ deleted=false ด้วย)
    Optional<User> findByEmailIgnoreCaseAndDeletedFalse(String email);

    List<User> findByRoleIgnoreCase(String role);
    List<User> findByDeletedFalse();
    List<User> findByDeletedTrue();
}
