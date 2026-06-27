package com.sdkwork.clawrouter.backend.model;


public class StorageBucketConfig {
    private Boolean blockPublicAccess;
    private String bucketName;
    private String bucketRegion;
    private String createdAt;
    private String defaultEncryptionMode;
    private String defaultStorageClass;
    private String encryption;
    private String id;
    private String kmsKeyRef;
    private Boolean lifecycleEnabled;
    private String logicalScope;
    private String objectKeyPrefix;
    private Boolean objectLockEnabled;
    private String providerCode;
    private String providerId;
    private Boolean publicAccessBlocked;
    private String status;
    private String storageClass;
    private String updatedAt;
    private Boolean versioningEnabled;

    public Boolean getBlockPublicAccess() {
        return this.blockPublicAccess;
    }

    public void setBlockPublicAccess(Boolean blockPublicAccess) {
        this.blockPublicAccess = blockPublicAccess;
    }

    public String getBucketName() {
        return this.bucketName;
    }

    public void setBucketName(String bucketName) {
        this.bucketName = bucketName;
    }

    public String getBucketRegion() {
        return this.bucketRegion;
    }

    public void setBucketRegion(String bucketRegion) {
        this.bucketRegion = bucketRegion;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getDefaultEncryptionMode() {
        return this.defaultEncryptionMode;
    }

    public void setDefaultEncryptionMode(String defaultEncryptionMode) {
        this.defaultEncryptionMode = defaultEncryptionMode;
    }

    public String getDefaultStorageClass() {
        return this.defaultStorageClass;
    }

    public void setDefaultStorageClass(String defaultStorageClass) {
        this.defaultStorageClass = defaultStorageClass;
    }

    public String getEncryption() {
        return this.encryption;
    }

    public void setEncryption(String encryption) {
        this.encryption = encryption;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getKmsKeyRef() {
        return this.kmsKeyRef;
    }

    public void setKmsKeyRef(String kmsKeyRef) {
        this.kmsKeyRef = kmsKeyRef;
    }

    public Boolean getLifecycleEnabled() {
        return this.lifecycleEnabled;
    }

    public void setLifecycleEnabled(Boolean lifecycleEnabled) {
        this.lifecycleEnabled = lifecycleEnabled;
    }

    public String getLogicalScope() {
        return this.logicalScope;
    }

    public void setLogicalScope(String logicalScope) {
        this.logicalScope = logicalScope;
    }

    public String getObjectKeyPrefix() {
        return this.objectKeyPrefix;
    }

    public void setObjectKeyPrefix(String objectKeyPrefix) {
        this.objectKeyPrefix = objectKeyPrefix;
    }

    public Boolean getObjectLockEnabled() {
        return this.objectLockEnabled;
    }

    public void setObjectLockEnabled(Boolean objectLockEnabled) {
        this.objectLockEnabled = objectLockEnabled;
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

    public Boolean getPublicAccessBlocked() {
        return this.publicAccessBlocked;
    }

    public void setPublicAccessBlocked(Boolean publicAccessBlocked) {
        this.publicAccessBlocked = publicAccessBlocked;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStorageClass() {
        return this.storageClass;
    }

    public void setStorageClass(String storageClass) {
        this.storageClass = storageClass;
    }

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Boolean getVersioningEnabled() {
        return this.versioningEnabled;
    }

    public void setVersioningEnabled(Boolean versioningEnabled) {
        this.versioningEnabled = versioningEnabled;
    }
}
