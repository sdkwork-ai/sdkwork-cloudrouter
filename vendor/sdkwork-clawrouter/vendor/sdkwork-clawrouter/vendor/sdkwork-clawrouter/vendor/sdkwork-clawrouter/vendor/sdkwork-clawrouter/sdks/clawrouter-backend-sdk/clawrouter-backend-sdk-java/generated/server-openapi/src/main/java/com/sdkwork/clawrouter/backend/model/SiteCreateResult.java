package com.sdkwork.clawrouter.backend.model;


public class SiteCreateResult {
    private String code;
    private AdminSiteMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminSiteMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminSiteMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
