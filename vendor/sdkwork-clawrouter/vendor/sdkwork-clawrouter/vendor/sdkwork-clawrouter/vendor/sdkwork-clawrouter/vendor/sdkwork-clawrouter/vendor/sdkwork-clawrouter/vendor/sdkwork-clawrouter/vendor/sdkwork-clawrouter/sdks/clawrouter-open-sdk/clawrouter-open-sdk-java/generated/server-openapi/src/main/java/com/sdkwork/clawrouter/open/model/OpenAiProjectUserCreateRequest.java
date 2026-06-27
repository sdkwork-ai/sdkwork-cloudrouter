package com.sdkwork.clawrouter.open.model;


public class OpenAiProjectUserCreateRequest {
    private String role;
    private String userId;

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getUserId() {
        return this.userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
