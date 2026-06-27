package com.sdkwork.clawrouter.backend.model;


public class ModelsDeleteResult {
    private String code;
    private AdminDeleteResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminDeleteResponse getData() {
        return this.data;
    }

    public void setData(AdminDeleteResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
