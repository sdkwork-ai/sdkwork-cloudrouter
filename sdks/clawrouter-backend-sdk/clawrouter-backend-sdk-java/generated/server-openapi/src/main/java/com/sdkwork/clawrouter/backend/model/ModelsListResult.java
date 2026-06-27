package com.sdkwork.clawrouter.backend.model;


public class ModelsListResult {
    private String code;
    private AdminAiModelsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminAiModelsResponse getData() {
        return this.data;
    }

    public void setData(AdminAiModelsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
