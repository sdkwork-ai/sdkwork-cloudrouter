package com.sdkwork.clawrouter.backend.model;


public class OssDefaultBucketsListResult {
    private String code;
    private StorageDefaultBucketListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageDefaultBucketListResponse getData() {
        return this.data;
    }

    public void setData(StorageDefaultBucketListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
