package com.sdkwork.clawrouter.backend.model;


public class MonitorNodesListResult {
    private String code;
    private AdminMonitorNodesResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMonitorNodesResponse getData() {
        return this.data;
    }

    public void setData(AdminMonitorNodesResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
