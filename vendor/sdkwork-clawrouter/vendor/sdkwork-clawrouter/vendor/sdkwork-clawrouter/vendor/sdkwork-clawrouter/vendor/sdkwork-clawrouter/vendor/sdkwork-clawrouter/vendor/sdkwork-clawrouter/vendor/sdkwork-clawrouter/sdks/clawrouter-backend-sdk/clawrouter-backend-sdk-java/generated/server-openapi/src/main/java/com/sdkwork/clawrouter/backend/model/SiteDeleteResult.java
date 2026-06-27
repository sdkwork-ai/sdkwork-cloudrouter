package com.sdkwork.clawrouter.backend.model;


public class SiteDeleteResult {
    private String code;
    private AdminSiteDeleteResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminSiteDeleteResponse getData() {
        return this.data;
    }

    public void setData(AdminSiteDeleteResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
