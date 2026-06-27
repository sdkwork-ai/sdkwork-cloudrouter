package com.sdkwork.clawrouter.backend.model;


public class ServiceNodesListResult {
    private String code;
    private AdminServiceNodesResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminServiceNodesResponse getData() {
        return this.data;
    }

    public void setData(AdminServiceNodesResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
