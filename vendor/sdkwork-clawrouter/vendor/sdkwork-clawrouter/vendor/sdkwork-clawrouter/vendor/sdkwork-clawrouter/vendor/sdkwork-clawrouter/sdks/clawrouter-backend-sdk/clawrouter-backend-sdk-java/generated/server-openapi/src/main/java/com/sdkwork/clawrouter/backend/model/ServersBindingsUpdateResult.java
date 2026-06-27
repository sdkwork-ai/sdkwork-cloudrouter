package com.sdkwork.clawrouter.backend.model;


public class ServersBindingsUpdateResult {
    private String code;
    private AdminMcpBindingMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMcpBindingMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminMcpBindingMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
