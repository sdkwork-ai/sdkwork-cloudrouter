package com.sdkwork.clawrouter.app.model;


public class InvocationsSubmitResult {
    private String code;
    private RuntimeInvocationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RuntimeInvocationResponse getData() {
        return this.data;
    }

    public void setData(RuntimeInvocationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
