// CorsConfig.java
package com.badminton.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.*;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration cfg = new CorsConfiguration();

    // ✅ ใส่ origin ที่อนุญาตเท่านั้น (ห้ามใช้ *)
    cfg.setAllowedOrigins(List.of(
        "http://localhost:3000",
        "https://badminton-hzwm.vercel.app",
        "https://badminton-mongo.vercel.app"
        // เพิ่ม origin อื่นถ้ามี
    ));

    cfg.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization","Content-Type","Accept"));
    cfg.setExposedHeaders(List.of("Location"));
    cfg.setAllowCredentials(true); // ถ้าใช้ cookie/credential ให้ true

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cfg);
    return source;
  }
}
