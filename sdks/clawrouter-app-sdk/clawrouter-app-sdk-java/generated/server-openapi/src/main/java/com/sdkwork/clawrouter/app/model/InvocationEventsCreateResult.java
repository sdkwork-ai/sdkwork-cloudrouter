package com.sdkwork.clawrouter.app.model;


public class InvocationEventsCreateResult {
    private String code;
    private RuntimeEventResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RuntimeEventResponse getData() {
        return this.data;
    }

    public void setData(RuntimeEventResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
