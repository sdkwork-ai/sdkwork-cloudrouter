package com.sdkwork.clawrouter.app.model;


public class ApiKeysCreateResult {
    private String code;
    private CreateApiKeyResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public CreateApiKeyResponse getData() {
        return this.data;
    }

    public void setData(CreateApiKeyResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
