package com.sdkwork.clawrouter.backend.model;


public class ModelMappingsResolveCreateResult {
    private String code;
    private AdminModelMappingResolveResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminModelMappingResolveResponse getData() {
        return this.data;
    }

    public void setData(AdminModelMappingResolveResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
