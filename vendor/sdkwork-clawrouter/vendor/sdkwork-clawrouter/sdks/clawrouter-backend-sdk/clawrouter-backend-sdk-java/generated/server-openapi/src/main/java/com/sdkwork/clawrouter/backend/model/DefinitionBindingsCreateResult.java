package com.sdkwork.clawrouter.backend.model;


public class DefinitionBindingsCreateResult {
    private String code;
    private AdminPromptBindingMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminPromptBindingMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminPromptBindingMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
