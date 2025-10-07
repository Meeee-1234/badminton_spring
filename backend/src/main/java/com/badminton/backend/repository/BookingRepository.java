package com.badminton.backend.repository;

import com.badminton.backend.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findByDateAndStatusIn(String date, List<String> status);
    List<Booking> findByUserId(String userId);
    List<Booking> findByUserIdAndDateAndStatusIn(String userId, String date, List<String> status);
    Optional<Booking> findByDateAndCourtAndHourAndStatusIn(String date, int court, int hour, List<String> status);
}
