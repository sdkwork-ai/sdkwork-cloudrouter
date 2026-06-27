package com.sdkwork.clawrouter.backend.model;


public class DashboardRetrieveResult {
    private String code;
    private ServiceProviderDashboardResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ServiceProviderDashboardResponse getData() {
        return this.data;
    }

    public void setData(ServiceProviderDashboardResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
