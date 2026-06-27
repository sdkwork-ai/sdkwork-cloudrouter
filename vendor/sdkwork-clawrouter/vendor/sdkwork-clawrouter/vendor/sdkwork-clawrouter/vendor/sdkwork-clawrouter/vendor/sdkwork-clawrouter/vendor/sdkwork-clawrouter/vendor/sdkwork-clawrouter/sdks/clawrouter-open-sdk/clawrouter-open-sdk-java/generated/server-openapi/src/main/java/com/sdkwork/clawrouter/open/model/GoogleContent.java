package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleContent {
    private List<GooglePart> parts;
    private String role;

    public List<GooglePart> getParts() {
        return this.parts;
    }

    public void setParts(List<GooglePart> parts) {
        this.parts = parts;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
