package com.sdkwork.clawrouter.backend.model;


public class DashboardAdminOverviewRetrieveResult {
    private String code;
    private AdminDashboardDataResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminDashboardDataResponse getData() {
        return this.data;
    }

    public void setData(AdminDashboardDataResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
