package com.sdkwork.clawrouter.backend.model;


public class DiagnosticsTestSendsCreateResult {
    private String code;
    private MessagingTestSendResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public MessagingTestSendResponse getData() {
        return this.data;
    }

    public void setData(MessagingTestSendResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
