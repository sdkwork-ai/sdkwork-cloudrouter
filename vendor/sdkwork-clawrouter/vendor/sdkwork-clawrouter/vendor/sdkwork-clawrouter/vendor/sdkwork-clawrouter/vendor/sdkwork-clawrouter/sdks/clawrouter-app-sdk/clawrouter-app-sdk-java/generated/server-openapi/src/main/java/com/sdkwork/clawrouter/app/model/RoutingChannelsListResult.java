package com.sdkwork.clawrouter.app.model;


public class RoutingChannelsListResult {
    private String code;
    private RoutingChannelsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RoutingChannelsResponse getData() {
        return this.data;
    }

    public void setData(RoutingChannelsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
