package com.sdkwork.clawrouter.backend.model;


public class OssBucketsListResult {
    private String code;
    private StorageBucketListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageBucketListResponse getData() {
        return this.data;
    }

    public void setData(StorageBucketListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
