package com.sdkwork.clawrouter.app.model;


public class UsageLogsListResult {
    private String code;
    private UsageLogsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public UsageLogsResponse getData() {
        return this.data;
    }

    public void setData(UsageLogsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
