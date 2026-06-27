package com.sdkwork.clawrouter.backend.model;


public class OssDefaultBucketsUpdateResult {
    private String code;
    private StorageDefaultBucketMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageDefaultBucketMutationResponse getData() {
        return this.data;
    }

    public void setData(StorageDefaultBucketMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
