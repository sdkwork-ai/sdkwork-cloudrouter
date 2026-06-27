package com.sdkwork.clawrouter.backend.model;


public class DefinitionBindingsListResult {
    private String code;
    private AdminPromptBindingListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminPromptBindingListResponse getData() {
        return this.data;
    }

    public void setData(AdminPromptBindingListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
