package com.badminton.backend.controller.dto;

import jakarta.validation.constraints.*;

public class CreateBookingRequest {
  
  @NotBlank
  private String date; 

  @Min(1) @Max(100)
  private int court;

  @Min(0) @Max(23)
  private int hour;

  private String note;

  public String getDate() { 
    return date; 
  }

  public void setDate(String date) { 
    this.date = date; 
  }

  public int getCourt() { 
    return court; 
  }

  public void setCourt(int court) { 
    this.court = court; 
  }
  public int getHour() { 
    return hour; 
  }

  public void setHour(int hour) { 
    this.hour = hour; 
  }

  public String getNote() { 
    return note; 
  }

  public void setNote(String note) { 
    this.note = note; 
  }
  
}
