package com.sdkwork.clawrouter.app.model;


public class NotificationsListResult {
    private String code;
    private NotificationListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public NotificationListResponse getData() {
        return this.data;
    }

    public void setData(NotificationListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
