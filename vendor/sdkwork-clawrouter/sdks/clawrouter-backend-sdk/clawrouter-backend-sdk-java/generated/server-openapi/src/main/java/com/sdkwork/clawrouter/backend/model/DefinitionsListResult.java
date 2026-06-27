package com.sdkwork.clawrouter.backend.model;


public class DefinitionsListResult {
    private String code;
    private AdminPromptListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminPromptListResponse getData() {
        return this.data;
    }

    public void setData(AdminPromptListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
