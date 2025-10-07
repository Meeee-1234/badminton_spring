package com.badminton.backend.config;

import com.badminton.backend.model.User;
import com.badminton.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class AdminSeeder {

    @Bean
    CommandLineRunner initAdmin(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        return args -> {
            String adminEmail = "admin@gmail.com";
            if (!userRepository.existsByEmail(adminEmail)) {
                User admin = new User();
                admin.setName("Admin");
                admin.setEmail(adminEmail);
                admin.setPhone("0812345678");
                admin.setPassword(passwordEncoder.encode("Admin1234!"));
                admin.setRole("admin");
                userRepository.save(admin);
                System.out.println("✅ Admin user created");
            } else {
                System.out.println("✅ Admin already exists");
            }
        };
    }
}
