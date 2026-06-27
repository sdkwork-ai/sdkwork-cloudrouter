package com.sdkwork.clawrouter.backend.model;


public class CacheNamespacesRefreshCreateResult {
    private String code;
    private AdminCacheOperationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminCacheOperationResponse getData() {
        return this.data;
    }

    public void setData(AdminCacheOperationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
