package com.sdkwork.clawrouter.backend.model;


public class ModelsCreateResult {
    private String code;
    private AdminAiModelMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminAiModelMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminAiModelMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
