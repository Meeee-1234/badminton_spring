package com.badminton.backend.service;

import com.badminton.backend.model.Booking;
import com.badminton.backend.repository.BookingRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookingService {
  private final BookingRepository bookingRepository;

  public BookingService(BookingRepository bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  public Booking createBooked(String dateKey, int court, int hour, String userId, String note) {
    Booking b = new Booking();
    b.setDateKey(dateKey);
    b.setCourt(court);
    b.setHour(hour);
    b.setUserId(userId);
    b.setNote(note);
    b.setStatus("booked");
    try {
      return bookingRepository.save(b);
    } catch (DuplicateKeyException e) {
      throw new IllegalStateException("slot already taken");
    }
  }

  public List<Booking> getByDate(String dateKey) {
    return bookingRepository.findByDateKey(dateKey);
  }

  public List<Booking> getMineByDate(String dateKey, String userId) {
    return bookingRepository.findByDateKeyAndUserId(dateKey, userId);
  }
}
