package com.sdkwork.clawrouter.backend.model;


public class AuthSettingsRetrieveResult {
    private String code;
    private AdminAuthSettingsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminAuthSettingsResponse getData() {
        return this.data;
    }

    public void setData(AdminAuthSettingsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
