package com.badminton.backend.controller.dto;

public class UpdateStatusRequest {
    private String status; // "booked" | "arrived" | "checked_in" | "canceled"

    public UpdateStatusRequest() {}

    public UpdateStatusRequest(String status) {
        this.status = status;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
