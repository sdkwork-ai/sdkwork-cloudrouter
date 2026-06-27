package com.sdkwork.clawrouter.backend.model;


public class ServiceNodesDeleteResult {
    private String code;
    private AdminServiceNodeDeleteResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminServiceNodeDeleteResponse getData() {
        return this.data;
    }

    public void setData(AdminServiceNodeDeleteResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
