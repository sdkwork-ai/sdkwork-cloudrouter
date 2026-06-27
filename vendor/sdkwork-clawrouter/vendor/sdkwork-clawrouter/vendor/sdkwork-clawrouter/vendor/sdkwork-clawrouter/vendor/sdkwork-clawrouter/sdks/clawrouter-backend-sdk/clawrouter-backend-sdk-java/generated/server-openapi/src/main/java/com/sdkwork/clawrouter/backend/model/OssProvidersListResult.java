package com.sdkwork.clawrouter.backend.model;


public class OssProvidersListResult {
    private String code;
    private StorageProviderListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageProviderListResponse getData() {
        return this.data;
    }

    public void setData(StorageProviderListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
