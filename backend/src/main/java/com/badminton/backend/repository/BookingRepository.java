package com.badminton.backend.repository;

import com.badminton.backend.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends MongoRepository<Booking, String> {
  List<Booking> findByDateKey(String dateKey);
  List<Booking> findByDateKeyAndUserId(String dateKey, String userId);
  Optional<Booking> findByDateKeyAndCourtAndHour(String dateKey, int court, int hour);
}
