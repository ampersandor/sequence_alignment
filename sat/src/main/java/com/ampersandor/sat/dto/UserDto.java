package com.ampersandor.sat.dto;


import lombok.Data;
import lombok.ToString;

@Data
@ToString
public class UserDto {
    private String name;
    private String email;
    private String password;
    private String role;
    private String createdAt;
    private String updatedAt;
}
