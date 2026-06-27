package com.sdkwork.clawrouter.backend.model;


public class SiteChannelsListResult {
    private String code;
    private AdminSiteChannelsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminSiteChannelsResponse getData() {
        return this.data;
    }

    public void setData(AdminSiteChannelsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
