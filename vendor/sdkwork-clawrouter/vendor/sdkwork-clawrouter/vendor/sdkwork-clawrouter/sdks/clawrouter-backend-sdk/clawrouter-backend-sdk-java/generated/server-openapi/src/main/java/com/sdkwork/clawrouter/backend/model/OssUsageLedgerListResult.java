package com.sdkwork.clawrouter.backend.model;


public class OssUsageLedgerListResult {
    private String code;
    private StorageUsageLedgerListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageUsageLedgerListResponse getData() {
        return this.data;
    }

    public void setData(StorageUsageLedgerListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
