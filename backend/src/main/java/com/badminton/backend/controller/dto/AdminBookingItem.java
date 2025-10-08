package com.badminton.backend.controller.dto;

public class AdminBookingItem {

    private String id;
    private String date;
    private int court;
    private int hour;
    private String status;   
    private String userName; 
    private String note;

    public AdminBookingItem() {}

    public AdminBookingItem(String id, String date, int court, int hour, String status, String userName, String note) {
        this.id = id;
        this.date = date;
        this.court = court;
        this.hour = hour;
        this.status = status;
        this.userName = userName;
        this.note = note;
    }

    public String getId() { 
        return id; 
    }
    public String getDate() { 
        return date; 
    }

    public int getCourt() { 
        return court; 
    }

    public int getHour() { 
        return hour; 
    }

    public String getStatus() { 
        return status; 
    }

    public String getUserName() { 
        return userName; 
    }

    public String getNote() { 
        return note; 
    }

    public void setId(String id) { 
        this.id = id; 
    }

    public void setDate(String date) { 
        this.date = date; 
    }

    public void setCourt(int court) { 
        this.court = court; 
    }

    public void setHour(int hour) { 
        this.hour = hour; 
    }

    public void setStatus(String status) { 
        this.status = status; 
    }

    public void setUserName(String userName) { 
        this.userName = userName; 
    }

    public void setNote(String note) { 
        this.note = note; 
    }
}
