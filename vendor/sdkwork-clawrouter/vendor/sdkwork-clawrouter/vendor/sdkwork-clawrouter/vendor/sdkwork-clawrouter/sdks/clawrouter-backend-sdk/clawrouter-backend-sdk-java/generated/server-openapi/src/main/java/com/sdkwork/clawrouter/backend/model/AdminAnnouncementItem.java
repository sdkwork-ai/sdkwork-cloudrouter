package com.sdkwork.clawrouter.backend.model;


public class AdminAnnouncementItem {
    private String content;
    private String date;
    private String id;
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

    public String getDate() {
        return this.date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
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
