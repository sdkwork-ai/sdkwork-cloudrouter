package com.sdkwork.clawrouter.backend.model;


public class AiResourceGroupsListResult {
    private String code;
    private AdminAiResourceGroupsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminAiResourceGroupsResponse getData() {
        return this.data;
    }

    public void setData(AdminAiResourceGroupsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
