package com.badminton.backend.repository;

import com.badminton.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
    List<User> findByRoleIgnoreCase(String role);

    List<User> findByDeletedFalse();
    List<User> findByDeletedTrue();
}
