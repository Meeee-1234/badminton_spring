package com.badminton.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // ❗ ปิด CSRF
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll() // ✅ อนุญาตให้ทุกคนเข้าถึง /api/auth/*
                .requestMatchers("/api/users/**").permitAll()
                .anyRequest().authenticated() // 🔒 อื่น ๆ ต้อง login
            );

        return http.build(); // ✅ build โดยไม่ต้องใช้ httpBasic หรือ formLogin
    }
}
