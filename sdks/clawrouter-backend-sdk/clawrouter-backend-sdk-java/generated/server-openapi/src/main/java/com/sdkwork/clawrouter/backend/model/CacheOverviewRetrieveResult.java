package com.sdkwork.clawrouter.backend.model;


public class CacheOverviewRetrieveResult {
    private String code;
    private AdminCacheOverviewResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminCacheOverviewResponse getData() {
        return this.data;
    }

    public void setData(AdminCacheOverviewResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
