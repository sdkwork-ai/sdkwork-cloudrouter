package com.sdkwork.clawrouter.app.model;


public class InvocationsListResult {
    private String code;
    private RuntimeInvocationListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RuntimeInvocationListResponse getData() {
        return this.data;
    }

    public void setData(RuntimeInvocationListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
