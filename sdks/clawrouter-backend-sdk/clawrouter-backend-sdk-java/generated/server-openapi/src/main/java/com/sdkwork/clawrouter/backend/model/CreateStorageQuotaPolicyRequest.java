package com.sdkwork.clawrouter.backend.model;


public class CreateStorageQuotaPolicyRequest {
    private String enforcement;
    private String quotaLimit;
    private String quotaLimitBytes;
    private String scopeId;
    private String scopeType;
    private String singleFileLimitBytes;

    public String getEnforcement() {
        return this.enforcement;
    }

    public void setEnforcement(String enforcement) {
        this.enforcement = enforcement;
    }

    public String getQuotaLimit() {
        return this.quotaLimit;
    }

    public void setQuotaLimit(String quotaLimit) {
        this.quotaLimit = quotaLimit;
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
}
