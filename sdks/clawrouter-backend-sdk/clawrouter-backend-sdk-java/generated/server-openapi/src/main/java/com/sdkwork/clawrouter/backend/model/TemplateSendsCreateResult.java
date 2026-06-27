package com.sdkwork.clawrouter.backend.model;


public class TemplateSendsCreateResult {
    private String code;
    private MessagingTemplateSendResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public MessagingTemplateSendResponse getData() {
        return this.data;
    }

    public void setData(MessagingTemplateSendResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
