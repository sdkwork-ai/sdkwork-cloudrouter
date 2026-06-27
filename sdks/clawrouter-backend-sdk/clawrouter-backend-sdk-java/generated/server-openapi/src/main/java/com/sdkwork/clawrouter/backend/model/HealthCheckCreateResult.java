package com.sdkwork.clawrouter.backend.model;


public class HealthCheckCreateResult {
    private String code;
    private AdminSiteConnectionCheckResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminSiteConnectionCheckResponse getData() {
        return this.data;
    }

    public void setData(AdminSiteConnectionCheckResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
