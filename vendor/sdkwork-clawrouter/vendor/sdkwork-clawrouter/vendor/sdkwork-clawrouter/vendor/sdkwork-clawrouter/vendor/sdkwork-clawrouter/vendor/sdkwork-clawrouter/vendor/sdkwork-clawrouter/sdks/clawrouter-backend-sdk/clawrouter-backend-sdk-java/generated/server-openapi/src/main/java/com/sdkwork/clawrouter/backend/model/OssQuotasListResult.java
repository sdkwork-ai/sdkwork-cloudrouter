package com.sdkwork.clawrouter.backend.model;


public class OssQuotasListResult {
    private String code;
    private StorageQuotaPolicyListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageQuotaPolicyListResponse getData() {
        return this.data;
    }

    public void setData(StorageQuotaPolicyListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
