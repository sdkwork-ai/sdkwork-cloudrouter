package com.sdkwork.clawrouter.backend.model;


public class AdminAuthWechatOfficial {
    private String aesKeyRef;
    private String appId;
    private Boolean enabled;
    private String key;
    private String name;
    private String originalId;
    private Boolean primary;
    private String scene;
    private String secretRef;
    private String tokenRef;
    private String url;

    public String getAesKeyRef() {
        return this.aesKeyRef;
    }

    public void setAesKeyRef(String aesKeyRef) {
        this.aesKeyRef = aesKeyRef;
    }

    public String getAppId() {
        return this.appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public Boolean getEnabled() {
        return this.enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getKey() {
        return this.key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOriginalId() {
        return this.originalId;
    }

    public void setOriginalId(String originalId) {
        this.originalId = originalId;
    }

    public Boolean getPrimary() {
        return this.primary;
    }

    public void setPrimary(Boolean primary) {
        this.primary = primary;
    }

    public String getScene() {
        return this.scene;
    }

    public void setScene(String scene) {
        this.scene = scene;
    }

    public String getSecretRef() {
        return this.secretRef;
    }

    public void setSecretRef(String secretRef) {
        this.secretRef = secretRef;
    }

    public String getTokenRef() {
        return this.tokenRef;
    }

    public void setTokenRef(String tokenRef) {
        this.tokenRef = tokenRef;
    }

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
