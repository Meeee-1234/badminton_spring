package com.badminton.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // ❌ ปิด CSRF สำหรับ API
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll() // ✅ ให้ register / login ผ่านได้
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults()); // ✅ หรือใช้ formLogin() ก็ได้

        return http.build();
    }
}
