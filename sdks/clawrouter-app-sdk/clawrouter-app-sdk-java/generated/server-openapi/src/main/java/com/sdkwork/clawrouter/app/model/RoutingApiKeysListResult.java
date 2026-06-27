package com.sdkwork.clawrouter.app.model;


public class RoutingApiKeysListResult {
    private String code;
    private RoutingApiKeysResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RoutingApiKeysResponse getData() {
        return this.data;
    }

    public void setData(RoutingApiKeysResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
