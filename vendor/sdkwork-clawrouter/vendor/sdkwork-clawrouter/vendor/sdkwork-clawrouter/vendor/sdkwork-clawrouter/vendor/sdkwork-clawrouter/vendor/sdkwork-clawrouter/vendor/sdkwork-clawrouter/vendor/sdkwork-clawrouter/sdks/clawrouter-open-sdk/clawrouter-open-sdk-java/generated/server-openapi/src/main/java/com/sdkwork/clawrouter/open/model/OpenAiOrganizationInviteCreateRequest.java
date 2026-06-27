package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiOrganizationInviteCreateRequest {
    private String email;
    private List<String> projects;
    private String role;

    public String getEmail() {
        return this.email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public List<String> getProjects() {
        return this.projects;
    }

    public void setProjects(List<String> projects) {
        this.projects = projects;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
