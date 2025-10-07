package com.badminton.backend.model;


import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;


@Document(collection = "profiles")
public class Profile {
@Id
private String id;


@DBRef
private User user;


private String emergencyName;
private String emergencyPhone;


public Profile() {}


public Profile(User user, String emergencyName, String emergencyPhone) {
this.user = user;
this.emergencyName = emergencyName;
this.emergencyPhone = emergencyPhone;
}


public String getId() { return id; }
public User getUser() { return user; }
public String getEmergencyName() { return emergencyName; }
public String getEmergencyPhone() { return emergencyPhone; }


public void setId(String id) { this.id = id; }
public void setUser(User user) { this.user = user; }
public void setEmergencyName(String emergencyName) { this.emergencyName = emergencyName; }
public void setEmergencyPhone(String emergencyPhone) { this.emergencyPhone = emergencyPhone; }
}