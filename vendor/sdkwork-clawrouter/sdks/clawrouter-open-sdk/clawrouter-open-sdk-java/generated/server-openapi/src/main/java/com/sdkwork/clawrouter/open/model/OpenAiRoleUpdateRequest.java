package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiRoleUpdateRequest {
    private String description;
    private String name;
    private List<String> permissions;

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getPermissions() {
        return this.permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
    }
}
