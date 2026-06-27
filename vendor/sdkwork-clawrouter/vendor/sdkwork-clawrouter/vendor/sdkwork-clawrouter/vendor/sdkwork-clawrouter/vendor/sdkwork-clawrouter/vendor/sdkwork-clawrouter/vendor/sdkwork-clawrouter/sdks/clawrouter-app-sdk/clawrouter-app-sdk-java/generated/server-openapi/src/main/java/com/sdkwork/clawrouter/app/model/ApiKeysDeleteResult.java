package com.sdkwork.clawrouter.app.model;


public class ApiKeysDeleteResult {
    private String code;
    private DeleteApiKeyResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public DeleteApiKeyResponse getData() {
        return this.data;
    }

    public void setData(DeleteApiKeyResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
