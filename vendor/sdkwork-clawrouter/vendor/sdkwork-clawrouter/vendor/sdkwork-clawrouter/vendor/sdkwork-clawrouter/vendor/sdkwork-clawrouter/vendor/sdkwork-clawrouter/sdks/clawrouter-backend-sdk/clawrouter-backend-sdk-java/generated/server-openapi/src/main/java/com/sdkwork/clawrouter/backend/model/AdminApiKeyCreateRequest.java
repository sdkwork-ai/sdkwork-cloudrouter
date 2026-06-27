package com.sdkwork.clawrouter.backend.model;


public class AdminApiKeyCreateRequest {
    private String name;
    private String userId;

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUserId() {
        return this.userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
