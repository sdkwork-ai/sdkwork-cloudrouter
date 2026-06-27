package com.sdkwork.clawrouter.backend.model;


public class CacheNamespacesKeysListResult {
    private String code;
    private AdminCacheKeyListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminCacheKeyListResponse getData() {
        return this.data;
    }

    public void setData(AdminCacheKeyListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
