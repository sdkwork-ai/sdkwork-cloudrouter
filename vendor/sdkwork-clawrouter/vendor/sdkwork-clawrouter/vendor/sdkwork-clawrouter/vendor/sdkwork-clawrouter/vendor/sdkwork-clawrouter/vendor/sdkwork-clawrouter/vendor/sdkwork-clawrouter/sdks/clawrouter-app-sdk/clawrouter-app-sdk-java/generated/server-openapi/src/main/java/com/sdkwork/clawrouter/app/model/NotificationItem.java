package com.sdkwork.clawrouter.app.model;


public class NotificationItem {
    private String actionUrl;
    private String appId;
    private Boolean archived;
    private String content;
    private String desc;
    private String id;
    private Boolean popupSeen;
    private Boolean read;
    private Boolean showAsPopup;
    private String time;
    private String title;
    private String type;

    public String getActionUrl() {
        return this.actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public String getAppId() {
        return this.appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public Boolean getArchived() {
        return this.archived;
    }

    public void setArchived(Boolean archived) {
        this.archived = archived;
    }

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getDesc() {
        return this.desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Boolean getPopupSeen() {
        return this.popupSeen;
    }

    public void setPopupSeen(Boolean popupSeen) {
        this.popupSeen = popupSeen;
    }

    public Boolean getRead() {
        return this.read;
    }

    public void setRead(Boolean read) {
        this.read = read;
    }

    public Boolean getShowAsPopup() {
        return this.showAsPopup;
    }

    public void setShowAsPopup(Boolean showAsPopup) {
        this.showAsPopup = showAsPopup;
    }

    public String getTime() {
        return this.time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
