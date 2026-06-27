package com.sdkwork.clawrouter.backend.model;


public class RateLimitsIpCreateResult {
    private String code;
    private AdminRateLimitMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminRateLimitMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminRateLimitMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
