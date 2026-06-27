package com.sdkwork.clawrouter.app.model;


public class NotificationMutationResponse {
    private String state;
    private Boolean updated;

    public String getState() {
        return this.state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public Boolean getUpdated() {
        return this.updated;
    }

    public void setUpdated(Boolean updated) {
        this.updated = updated;
    }
}
