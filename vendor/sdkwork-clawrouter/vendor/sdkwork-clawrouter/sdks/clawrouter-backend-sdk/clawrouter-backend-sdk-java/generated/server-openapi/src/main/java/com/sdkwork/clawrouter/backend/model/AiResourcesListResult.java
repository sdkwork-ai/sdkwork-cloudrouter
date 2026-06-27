package com.sdkwork.clawrouter.backend.model;


public class AiResourcesListResult {
    private String code;
    private AdminAiResourcesResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminAiResourcesResponse getData() {
        return this.data;
    }

    public void setData(AdminAiResourcesResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
