package com.sdkwork.clawrouter.backend.model;


public class ModelMappingsListResult {
    private String code;
    private AdminModelMappingsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminModelMappingsResponse getData() {
        return this.data;
    }

    public void setData(AdminModelMappingsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
