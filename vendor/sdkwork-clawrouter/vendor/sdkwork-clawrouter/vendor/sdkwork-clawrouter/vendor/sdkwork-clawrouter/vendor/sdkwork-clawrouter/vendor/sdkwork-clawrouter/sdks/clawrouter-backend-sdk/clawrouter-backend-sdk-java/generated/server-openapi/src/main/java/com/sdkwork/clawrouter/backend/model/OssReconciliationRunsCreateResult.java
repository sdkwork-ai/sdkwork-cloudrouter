package com.sdkwork.clawrouter.backend.model;


public class OssReconciliationRunsCreateResult {
    private String code;
    private StorageReconciliationRunMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageReconciliationRunMutationResponse getData() {
        return this.data;
    }

    public void setData(StorageReconciliationRunMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
