
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
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
               
                .requestMatchers("/api/admin/users/**").permitAll()

                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/users/**").permitAll()
                .requestMatchers("/api/profile/**").permitAll()
                .requestMatchers("/api/bookings/**").permitAll()
                .requestMatchers("/api/admin/**").permitAll()
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
