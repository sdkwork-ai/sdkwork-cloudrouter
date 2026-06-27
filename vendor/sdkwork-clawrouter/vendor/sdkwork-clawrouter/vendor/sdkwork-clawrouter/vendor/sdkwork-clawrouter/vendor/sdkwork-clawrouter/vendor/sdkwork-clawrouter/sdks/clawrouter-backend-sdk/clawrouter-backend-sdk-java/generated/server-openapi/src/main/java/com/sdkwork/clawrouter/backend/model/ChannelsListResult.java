package com.sdkwork.clawrouter.backend.model;


public class ChannelsListResult {
    private String code;
    private AdminChannelsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminChannelsResponse getData() {
        return this.data;
    }

    public void setData(AdminChannelsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
