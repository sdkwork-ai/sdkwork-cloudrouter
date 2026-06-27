package com.sdkwork.clawrouter.app.model;


public class NotificationsAcknowledgeCreateResult {
    private String code;
    private NotificationMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public NotificationMutationResponse getData() {
        return this.data;
    }

    public void setData(NotificationMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
