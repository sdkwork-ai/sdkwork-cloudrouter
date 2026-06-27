package com.sdkwork.clawrouter.backend.model;


public class ModelVendorsCreateResult {
    private String code;
    private AdminModelVendorMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminModelVendorMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminModelVendorMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
