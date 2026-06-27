package com.sdkwork.clawrouter.app.model;


public class GatewayTracesListResult {
    private String code;
    private GatewayTracesResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public GatewayTracesResponse getData() {
        return this.data;
    }

    public void setData(GatewayTracesResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
