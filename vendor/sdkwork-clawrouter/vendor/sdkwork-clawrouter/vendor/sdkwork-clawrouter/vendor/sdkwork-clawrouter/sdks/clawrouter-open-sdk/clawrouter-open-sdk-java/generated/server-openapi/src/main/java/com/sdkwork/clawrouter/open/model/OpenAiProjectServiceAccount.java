package com.sdkwork.clawrouter.open.model;


public class OpenAiProjectServiceAccount {
    private OpenAiProjectApiKey apiKey;
    private Integer createdAt;
    private String id;
    private String name;
    private String object;
    private String role;

    public OpenAiProjectApiKey getApiKey() {
        return this.apiKey;
    }

    public void setApiKey(OpenAiProjectApiKey apiKey) {
        this.apiKey = apiKey;
    }

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
