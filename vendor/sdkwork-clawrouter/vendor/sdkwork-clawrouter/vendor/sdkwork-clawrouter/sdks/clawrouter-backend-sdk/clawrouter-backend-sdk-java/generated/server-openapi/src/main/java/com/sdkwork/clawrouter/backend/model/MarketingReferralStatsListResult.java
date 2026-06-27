package com.sdkwork.clawrouter.backend.model;


public class MarketingReferralStatsListResult {
    private String code;
    private AdminReferralStatsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminReferralStatsResponse getData() {
        return this.data;
    }

    public void setData(AdminReferralStatsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
