package com.sdkwork.clawrouter.backend.model;


public class StorageUsageLedgerEntry {
    private String deltaBytes;
    private String id;
    private String occurredAt;
    private String scopeId;
    private String scopeType;

    public String getDeltaBytes() {
        return this.deltaBytes;
    }

    public void setDeltaBytes(String deltaBytes) {
        this.deltaBytes = deltaBytes;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOccurredAt() {
        return this.occurredAt;
    }

    public void setOccurredAt(String occurredAt) {
        this.occurredAt = occurredAt;
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
}
