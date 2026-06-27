package com.sdkwork.clawrouter.backend.model;


public class SiteCatalogListResult {
    private String code;
    private AdminSitesResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminSitesResponse getData() {
        return this.data;
    }

    public void setData(AdminSitesResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
