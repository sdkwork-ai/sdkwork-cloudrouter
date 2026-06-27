package com.sdkwork.clawrouter.backend.model;


public class SiteSettingsUpdateResult {
    private String code;
    private AdminSiteSettingsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminSiteSettingsResponse getData() {
        return this.data;
    }

    public void setData(AdminSiteSettingsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
