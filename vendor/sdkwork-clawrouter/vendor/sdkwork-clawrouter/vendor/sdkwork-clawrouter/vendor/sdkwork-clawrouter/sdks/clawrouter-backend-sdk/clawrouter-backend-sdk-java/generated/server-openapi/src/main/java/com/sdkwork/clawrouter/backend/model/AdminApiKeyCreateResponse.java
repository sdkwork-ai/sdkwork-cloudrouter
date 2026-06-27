package com.sdkwork.clawrouter.backend.model;


public class AdminApiKeyCreateResponse {
    private AdminApiKeyItem key;
    private String rawKey;

    public AdminApiKeyItem getKey() {
        return this.key;
    }

    public void setKey(AdminApiKeyItem key) {
        this.key = key;
    }

    public String getRawKey() {
        return this.rawKey;
    }

    public void setRawKey(String rawKey) {
        this.rawKey = rawKey;
    }
}
