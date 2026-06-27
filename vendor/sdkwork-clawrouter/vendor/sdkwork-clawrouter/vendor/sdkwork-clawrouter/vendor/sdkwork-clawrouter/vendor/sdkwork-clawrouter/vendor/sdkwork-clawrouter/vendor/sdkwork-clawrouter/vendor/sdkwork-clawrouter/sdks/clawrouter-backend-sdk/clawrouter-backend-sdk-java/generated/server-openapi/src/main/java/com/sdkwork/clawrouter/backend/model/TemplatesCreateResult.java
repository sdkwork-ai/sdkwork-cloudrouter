package com.sdkwork.clawrouter.backend.model;


public class TemplatesCreateResult {
    private String code;
    private MessagingMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public MessagingMutationResponse getData() {
        return this.data;
    }

    public void setData(MessagingMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
