package com.sdkwork.clawrouter.backend.model;


public class StorageDefaultBucketConfig {
    private String bucketId;
    private String bucketName;
    private String dataResidencyRegion;
    private String id;
    private String logicalScope;
    private String providerCode;
    private String providerId;
    private String providerType;
    private String reason;
    private String region;
    private String status;
    private String updatedAt;

    public String getBucketId() {
        return this.bucketId;
    }

    public void setBucketId(String bucketId) {
        this.bucketId = bucketId;
    }

    public String getBucketName() {
        return this.bucketName;
    }

    public void setBucketName(String bucketName) {
        this.bucketName = bucketName;
    }

    public String getDataResidencyRegion() {
        return this.dataResidencyRegion;
    }

    public void setDataResidencyRegion(String dataResidencyRegion) {
        this.dataResidencyRegion = dataResidencyRegion;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLogicalScope() {
        return this.logicalScope;
    }

    public void setLogicalScope(String logicalScope) {
        this.logicalScope = logicalScope;
    }

    public String getProviderCode() {
        return this.providerCode;
    }

    public void setProviderCode(String providerCode) {
        this.providerCode = providerCode;
    }

    public String getProviderId() {
        return this.providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getProviderType() {
        return this.providerType;
    }

    public void setProviderType(String providerType) {
        this.providerType = providerType;
    }

    public String getReason() {
        return this.reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getRegion() {
        return this.region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
