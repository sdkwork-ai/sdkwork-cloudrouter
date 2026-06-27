package com.sdkwork.clawrouter.backend.model;


public class MonitorAlertsListResult {
    private String code;
    private AdminMonitorAlertsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMonitorAlertsResponse getData() {
        return this.data;
    }

    public void setData(AdminMonitorAlertsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
