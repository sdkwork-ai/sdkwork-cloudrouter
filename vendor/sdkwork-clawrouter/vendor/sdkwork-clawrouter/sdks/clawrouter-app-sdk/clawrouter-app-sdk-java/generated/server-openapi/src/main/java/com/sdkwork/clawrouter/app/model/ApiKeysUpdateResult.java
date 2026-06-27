package com.sdkwork.clawrouter.app.model;


public class ApiKeysUpdateResult {
    private String code;
    private UpdateApiKeyResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public UpdateApiKeyResponse getData() {
        return this.data;
    }

    public void setData(UpdateApiKeyResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
