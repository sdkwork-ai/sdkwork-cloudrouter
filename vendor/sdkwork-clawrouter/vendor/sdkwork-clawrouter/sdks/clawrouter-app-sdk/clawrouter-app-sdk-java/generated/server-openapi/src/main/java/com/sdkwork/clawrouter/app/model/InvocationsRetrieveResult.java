package com.sdkwork.clawrouter.app.model;


public class InvocationsRetrieveResult {
    private String code;
    private RuntimeInvocationItem data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RuntimeInvocationItem getData() {
        return this.data;
    }

    public void setData(RuntimeInvocationItem data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
