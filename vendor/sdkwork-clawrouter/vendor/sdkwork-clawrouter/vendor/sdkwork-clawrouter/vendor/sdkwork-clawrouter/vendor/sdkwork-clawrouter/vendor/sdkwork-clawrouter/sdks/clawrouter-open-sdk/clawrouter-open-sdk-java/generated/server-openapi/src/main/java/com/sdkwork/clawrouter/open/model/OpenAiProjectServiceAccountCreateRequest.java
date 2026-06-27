package com.sdkwork.clawrouter.open.model;


public class OpenAiProjectServiceAccountCreateRequest {
    private String name;
    private String role;

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
