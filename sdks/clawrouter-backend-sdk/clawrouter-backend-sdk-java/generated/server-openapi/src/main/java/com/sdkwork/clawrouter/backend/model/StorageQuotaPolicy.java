package com.sdkwork.clawrouter.backend.model;


public class StorageQuotaPolicy {
    private String createdAt;
    private String enforcement;
    private String id;
    private String limit;
    private String quotaLimitBytes;
    private String scopeId;
    private String scopeType;
    private String singleFileLimitBytes;
    private String status;
    private String updatedAt;
    private String used;
    private String usedBytes;

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getEnforcement() {
        return this.enforcement;
    }

    public void setEnforcement(String enforcement) {
        this.enforcement = enforcement;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLimit() {
        return this.limit;
    }

    public void setLimit(String limit) {
        this.limit = limit;
    }

    public String getQuotaLimitBytes() {
        return this.quotaLimitBytes;
    }

    public void setQuotaLimitBytes(String quotaLimitBytes) {
        this.quotaLimitBytes = quotaLimitBytes;
    }

    public String getScopeId() {
        return this.scopeId;
    }

    public void setScopeId(String scopeId) {
        this.scopeId = scopeId;
    }

    public String getScopeType() {
        return this.scopeType;
    }

    public void setScopeType(String scopeType) {
        this.scopeType = scopeType;
    }

    public String getSingleFileLimitBytes() {
        return this.singleFileLimitBytes;
    }

    public void setSingleFileLimitBytes(String singleFileLimitBytes) {
        this.singleFileLimitBytes = singleFileLimitBytes;
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

    public String getUsed() {
        return this.used;
    }

    public void setUsed(String used) {
        this.used = used;
    }

    public String getUsedBytes() {
        return this.usedBytes;
    }

    public void setUsedBytes(String usedBytes) {
        this.usedBytes = usedBytes;
    }
}
