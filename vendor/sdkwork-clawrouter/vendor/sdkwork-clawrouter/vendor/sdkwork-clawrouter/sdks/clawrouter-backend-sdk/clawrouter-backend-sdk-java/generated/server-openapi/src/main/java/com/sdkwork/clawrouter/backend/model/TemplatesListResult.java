package com.sdkwork.clawrouter.backend.model;


public class TemplatesListResult {
    private String code;
    private MessagingCollectionResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public MessagingCollectionResponse getData() {
        return this.data;
    }

    public void setData(MessagingCollectionResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
