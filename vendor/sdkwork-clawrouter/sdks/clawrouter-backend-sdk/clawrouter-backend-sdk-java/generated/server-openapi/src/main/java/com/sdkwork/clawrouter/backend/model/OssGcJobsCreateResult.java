package com.sdkwork.clawrouter.backend.model;


public class OssGcJobsCreateResult {
    private String code;
    private StorageGarbageCollectionJobMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public StorageGarbageCollectionJobMutationResponse getData() {
        return this.data;
    }

    public void setData(StorageGarbageCollectionJobMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
