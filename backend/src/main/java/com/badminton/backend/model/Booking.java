package com.badminton.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("bookings")
@CompoundIndex(name = "unique_day_court_hour", def = "{'dateKey':1,'court':1,'hour':1}", unique = true)
public class Booking {
  @Id
  private String id;

  // YYYY-MM-DD (ตามที่ frontend ใช้)
  private String dateKey;
  private int court;
  private int hour;

  private String userId;
  private String note;

  // "booked" | "arrived"
  private String status = "booked";

  private Instant createdAt = Instant.now();

  public Booking() {}

  // getters/setters
  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getDateKey() { return dateKey; }
  public void setDateKey(String dateKey) { this.dateKey = dateKey; }

  public int getCourt() { return court; }
  public void setCourt(int court) { this.court = court; }

  public int getHour() { return hour; }
  public void setHour(int hour) { this.hour = hour; }

  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }

  public String getNote() { return note; }
  public void setNote(String note) { this.note = note; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
