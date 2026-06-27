package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiOrganizationUserUpdateRequest {
    private Map<String, String> metadata;
    private String role;

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
