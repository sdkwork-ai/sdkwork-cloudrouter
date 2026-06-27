package com.sdkwork.clawrouter.backend.model;


public class ProviderSecretsUpdateResult {
    private String code;
    private AdminProviderSecretMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminProviderSecretMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminProviderSecretMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
