package com.sdkwork.clawrouter.backend.model;


public class ServersCreateResult {
    private String code;
    private AdminMcpServerMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMcpServerMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminMcpServerMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
