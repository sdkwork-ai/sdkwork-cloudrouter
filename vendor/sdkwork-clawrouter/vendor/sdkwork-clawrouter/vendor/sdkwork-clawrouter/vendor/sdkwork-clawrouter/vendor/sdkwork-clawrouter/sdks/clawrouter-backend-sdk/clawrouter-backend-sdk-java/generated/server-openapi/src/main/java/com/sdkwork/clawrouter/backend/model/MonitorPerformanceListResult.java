package com.sdkwork.clawrouter.backend.model;


public class MonitorPerformanceListResult {
    private String code;
    private AdminMonitorPerformanceResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMonitorPerformanceResponse getData() {
        return this.data;
    }

    public void setData(AdminMonitorPerformanceResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
