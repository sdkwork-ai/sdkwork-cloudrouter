package com.sdkwork.clawrouter.app.model;


public class CreateApiKeyResponse {
    private AppApiKeyItem item;
    private String rawKey;

    public AppApiKeyItem getItem() {
        return this.item;
    }

    public void setItem(AppApiKeyItem item) {
        this.item = item;
    }

    public String getRawKey() {
        return this.rawKey;
    }

    public void setRawKey(String rawKey) {
        this.rawKey = rawKey;
    }
}
