package com.sdkwork.clawrouter.backend.model;


public class UsageListResult {
    private String code;
    private ServiceProviderCollectionResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ServiceProviderCollectionResponse getData() {
        return this.data;
    }

    public void setData(ServiceProviderCollectionResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
