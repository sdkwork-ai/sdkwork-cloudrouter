package com.sdkwork.clawrouter.backend.model;


public class CreateStorageProviderRequest {
    private String credentialRef;
    private String endpoint;
    private String endpointUrl;
    private Boolean lifecycle;
    private Boolean multipart;
    private Boolean objectLock;
    private Boolean pathStyleEnabled;
    private String providerCode;
    private String providerType;
    private String region;
    private Boolean supportsLifecycle;
    private Boolean supportsMultipart;
    private Boolean supportsObjectLock;

    public String getCredentialRef() {
        return this.credentialRef;
    }

    public void setCredentialRef(String credentialRef) {
        this.credentialRef = credentialRef;
    }

    public String getEndpoint() {
        return this.endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getEndpointUrl() {
        return this.endpointUrl;
    }

    public void setEndpointUrl(String endpointUrl) {
        this.endpointUrl = endpointUrl;
    }

    public Boolean getLifecycle() {
        return this.lifecycle;
    }

    public void setLifecycle(Boolean lifecycle) {
        this.lifecycle = lifecycle;
    }

    public Boolean getMultipart() {
        return this.multipart;
    }

    public void setMultipart(Boolean multipart) {
        this.multipart = multipart;
    }

    public Boolean getObjectLock() {
        return this.objectLock;
    }

    public void setObjectLock(Boolean objectLock) {
        this.objectLock = objectLock;
    }

    public Boolean getPathStyleEnabled() {
        return this.pathStyleEnabled;
    }

    public void setPathStyleEnabled(Boolean pathStyleEnabled) {
        this.pathStyleEnabled = pathStyleEnabled;
    }

    public String getProviderCode() {
        return this.providerCode;
    }

    public void setProviderCode(String providerCode) {
        this.providerCode = providerCode;
    }

    public String getProviderType() {
        return this.providerType;
    }

    public void setProviderType(String providerType) {
        this.providerType = providerType;
    }

    public String getRegion() {
        return this.region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public Boolean getSupportsLifecycle() {
        return this.supportsLifecycle;
    }

    public void setSupportsLifecycle(Boolean supportsLifecycle) {
        this.supportsLifecycle = supportsLifecycle;
    }

    public Boolean getSupportsMultipart() {
        return this.supportsMultipart;
    }

    public void setSupportsMultipart(Boolean supportsMultipart) {
        this.supportsMultipart = supportsMultipart;
    }

    public Boolean getSupportsObjectLock() {
        return this.supportsObjectLock;
    }

    public void setSupportsObjectLock(Boolean supportsObjectLock) {
        this.supportsObjectLock = supportsObjectLock;
    }
}
