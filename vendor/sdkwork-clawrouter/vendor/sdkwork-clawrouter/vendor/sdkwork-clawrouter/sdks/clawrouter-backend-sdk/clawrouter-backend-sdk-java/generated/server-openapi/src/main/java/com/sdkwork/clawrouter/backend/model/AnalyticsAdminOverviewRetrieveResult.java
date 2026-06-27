package com.sdkwork.clawrouter.backend.model;


public class AnalyticsAdminOverviewRetrieveResult {
    private String code;
    private AdminAnalyticsOverviewResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminAnalyticsOverviewResponse getData() {
        return this.data;
    }

    public void setData(AdminAnalyticsOverviewResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
