package com.badminton.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DBRef;

@Document(collection = "bookings")
public class Booking {
    @Id
    private String id;

    @DBRef
    private User user;

    private String date; 
    private int court;   
    private int hour; 
    private String status; 
    private String note;

    public Booking() {}

    public Booking(User user, String date, int court, int hour, String status, String note) {
        this.user = user;
        this.date = date;
        this.court = court;
        this.hour = hour;
        this.status = status;
        this.note = note;
    }

    public String getId() { 
        return id; 
    }

    public void setId(String id) { 
        this.id = id; 
    }

    public User getUser() { 
        return user; 
    }

    public void setUser(User user) { 
        this.user = user; 
    }

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

    public String getStatus() { 
        return status; 
    }

    public void setStatus(String status) { 
        this.status = status; 
    }

    public String getNote() { 
        return note; 
    }

    public void setNote(String note) { 
        this.note = note; 
    }
    
}
