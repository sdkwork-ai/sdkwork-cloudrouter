package com.sdkwork.clawrouter.backend.model;


public class ApiKeysCreateResult {
    private String code;
    private AdminApiKeyCreateResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminApiKeyCreateResponse getData() {
        return this.data;
    }

    public void setData(AdminApiKeyCreateResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
