package com.sdkwork.clawrouter.backend.model;


public class StorageUsageSnapshot {
    private String fileCount;
    private String id;
    private String reservedBytes;
    private String scope;
    private String scopeId;
    private String scopeType;
    private String snapshotAt;
    private String snapshotType;
    private String usedBytes;

    public String getFileCount() {
        return this.fileCount;
    }

    public void setFileCount(String fileCount) {
        this.fileCount = fileCount;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getReservedBytes() {
        return this.reservedBytes;
    }

    public void setReservedBytes(String reservedBytes) {
        this.reservedBytes = reservedBytes;
    }

    public String getScope() {
        return this.scope;
    }

    public void setScope(String scope) {
        this.scope = scope;
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

    public String getSnapshotAt() {
        return this.snapshotAt;
    }

    public void setSnapshotAt(String snapshotAt) {
        this.snapshotAt = snapshotAt;
    }

    public String getSnapshotType() {
        return this.snapshotType;
    }

    public void setSnapshotType(String snapshotType) {
        this.snapshotType = snapshotType;
    }

    public String getUsedBytes() {
        return this.usedBytes;
    }

    public void setUsedBytes(String usedBytes) {
        this.usedBytes = usedBytes;
    }
}
