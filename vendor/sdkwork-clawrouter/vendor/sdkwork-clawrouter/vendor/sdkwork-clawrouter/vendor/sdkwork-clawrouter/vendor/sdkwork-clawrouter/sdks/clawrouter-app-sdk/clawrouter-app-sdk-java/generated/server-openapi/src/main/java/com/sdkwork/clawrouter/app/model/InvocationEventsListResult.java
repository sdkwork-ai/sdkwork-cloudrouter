package com.sdkwork.clawrouter.app.model;


public class InvocationEventsListResult {
    private String code;
    private RuntimeEventListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RuntimeEventListResponse getData() {
        return this.data;
    }

    public void setData(RuntimeEventListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
