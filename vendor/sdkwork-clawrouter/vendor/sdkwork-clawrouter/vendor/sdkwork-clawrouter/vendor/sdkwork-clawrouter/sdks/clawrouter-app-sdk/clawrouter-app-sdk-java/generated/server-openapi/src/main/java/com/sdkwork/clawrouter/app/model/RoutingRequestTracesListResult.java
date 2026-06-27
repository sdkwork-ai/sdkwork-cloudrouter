package com.sdkwork.clawrouter.app.model;


public class RoutingRequestTracesListResult {
    private String code;
    private RoutingRequestTracesResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RoutingRequestTracesResponse getData() {
        return this.data;
    }

    public void setData(RoutingRequestTracesResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
