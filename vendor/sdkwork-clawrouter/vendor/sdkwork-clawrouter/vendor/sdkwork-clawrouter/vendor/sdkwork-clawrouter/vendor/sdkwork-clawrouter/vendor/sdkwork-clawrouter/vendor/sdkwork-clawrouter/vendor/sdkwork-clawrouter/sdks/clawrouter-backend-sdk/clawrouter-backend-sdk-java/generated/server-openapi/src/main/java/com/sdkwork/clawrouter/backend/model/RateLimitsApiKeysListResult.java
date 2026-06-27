package com.sdkwork.clawrouter.backend.model;


public class RateLimitsApiKeysListResult {
    private String code;
    private AdminTokenLimitsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminTokenLimitsResponse getData() {
        return this.data;
    }

    public void setData(AdminTokenLimitsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
