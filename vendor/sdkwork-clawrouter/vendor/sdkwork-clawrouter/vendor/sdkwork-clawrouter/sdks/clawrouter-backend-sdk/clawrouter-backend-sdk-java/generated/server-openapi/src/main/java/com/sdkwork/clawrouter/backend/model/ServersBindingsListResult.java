package com.sdkwork.clawrouter.backend.model;


public class ServersBindingsListResult {
    private String code;
    private AdminMcpBindingListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMcpBindingListResponse getData() {
        return this.data;
    }

    public void setData(AdminMcpBindingListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
