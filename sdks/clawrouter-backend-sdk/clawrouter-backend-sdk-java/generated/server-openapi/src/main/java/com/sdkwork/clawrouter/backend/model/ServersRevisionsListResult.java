package com.sdkwork.clawrouter.backend.model;


public class ServersRevisionsListResult {
    private String code;
    private AdminMcpServerRevisionListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMcpServerRevisionListResponse getData() {
        return this.data;
    }

    public void setData(AdminMcpServerRevisionListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
