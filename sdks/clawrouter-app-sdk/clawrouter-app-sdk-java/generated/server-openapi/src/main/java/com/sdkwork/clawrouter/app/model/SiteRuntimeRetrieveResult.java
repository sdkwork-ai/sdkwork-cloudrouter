package com.sdkwork.clawrouter.app.model;


public class SiteRuntimeRetrieveResult {
    private String code;
    private SiteRuntimeSettingsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public SiteRuntimeSettingsResponse getData() {
        return this.data;
    }

    public void setData(SiteRuntimeSettingsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
