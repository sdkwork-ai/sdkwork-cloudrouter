package com.sdkwork.clawrouter.backend.model;


public class ServersToolsListResult {
    private String code;
    private AdminMcpToolListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMcpToolListResponse getData() {
        return this.data;
    }

    public void setData(AdminMcpToolListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
