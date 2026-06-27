package com.sdkwork.clawrouter.backend.model;


public class VersionsListResult {
    private String code;
    private AdminPromptVersionListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminPromptVersionListResponse getData() {
        return this.data;
    }

    public void setData(AdminPromptVersionListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
