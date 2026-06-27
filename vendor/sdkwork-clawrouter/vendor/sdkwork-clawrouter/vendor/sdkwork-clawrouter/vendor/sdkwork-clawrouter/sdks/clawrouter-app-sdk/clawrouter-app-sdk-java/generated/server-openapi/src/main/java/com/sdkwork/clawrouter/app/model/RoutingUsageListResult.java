package com.sdkwork.clawrouter.app.model;


public class RoutingUsageListResult {
    private String code;
    private RoutingUsageSnapshot data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RoutingUsageSnapshot getData() {
        return this.data;
    }

    public void setData(RoutingUsageSnapshot data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
