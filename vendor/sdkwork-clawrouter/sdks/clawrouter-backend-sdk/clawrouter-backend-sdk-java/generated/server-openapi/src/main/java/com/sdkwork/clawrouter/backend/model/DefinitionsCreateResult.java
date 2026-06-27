package com.sdkwork.clawrouter.backend.model;


public class DefinitionsCreateResult {
    private String code;
    private AdminPromptMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminPromptMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminPromptMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
