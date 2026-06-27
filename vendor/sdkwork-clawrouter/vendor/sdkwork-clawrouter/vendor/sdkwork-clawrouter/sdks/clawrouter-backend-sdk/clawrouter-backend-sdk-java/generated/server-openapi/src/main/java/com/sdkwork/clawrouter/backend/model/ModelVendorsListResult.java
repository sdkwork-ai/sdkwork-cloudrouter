package com.sdkwork.clawrouter.backend.model;


public class ModelVendorsListResult {
    private String code;
    private AdminModelVendorsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminModelVendorsResponse getData() {
        return this.data;
    }

    public void setData(AdminModelVendorsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
