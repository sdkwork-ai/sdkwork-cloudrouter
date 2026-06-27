package com.sdkwork.clawrouter.backend.model;


public class AiResourceGroupsResourcesListResult {
    private String code;
    private AdminAiResourceGroupResourcesResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminAiResourceGroupResourcesResponse getData() {
        return this.data;
    }

    public void setData(AdminAiResourceGroupResourcesResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
