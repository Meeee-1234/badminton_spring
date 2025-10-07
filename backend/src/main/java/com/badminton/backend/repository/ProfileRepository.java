package com.badminton.backend.repository;

import com.badminton.backend.model.Profile;
import com.badminton.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ProfileRepository extends MongoRepository<Profile, String> {
    Optional<Profile> findByUser(User user);
}
