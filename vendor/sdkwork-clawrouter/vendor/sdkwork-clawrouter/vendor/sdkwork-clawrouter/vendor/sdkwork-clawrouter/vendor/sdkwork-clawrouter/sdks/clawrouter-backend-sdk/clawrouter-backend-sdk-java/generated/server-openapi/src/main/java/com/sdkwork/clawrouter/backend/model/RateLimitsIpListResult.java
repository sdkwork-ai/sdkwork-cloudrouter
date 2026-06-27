package com.sdkwork.clawrouter.backend.model;


public class RateLimitsIpListResult {
    private String code;
    private AdminIpLimitsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminIpLimitsResponse getData() {
        return this.data;
    }

    public void setData(AdminIpLimitsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
