package com.sdkwork.clawrouter.backend.model;


public class AdminAnnouncementCreateRequest {
    private String content;
    private Boolean showAsPopup;
    private String status;
    private String target;
    private String title;

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Boolean getShowAsPopup() {
        return this.showAsPopup;
    }

    public void setShowAsPopup(Boolean showAsPopup) {
        this.showAsPopup = showAsPopup;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTarget() {
        return this.target;
    }

    public void setTarget(String target) {
        this.target = target;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
