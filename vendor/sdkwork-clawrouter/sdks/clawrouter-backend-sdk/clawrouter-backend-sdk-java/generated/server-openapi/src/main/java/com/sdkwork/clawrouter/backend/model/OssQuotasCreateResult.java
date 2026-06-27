package com.sdkwork.clawrouter.backend.model;


public class OssQuotasCreateResult {
    private String code;
    private StorageQuotaPolicyMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageQuotaPolicyMutationResponse getData() {
        return this.data;
    }

    public void setData(StorageQuotaPolicyMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
