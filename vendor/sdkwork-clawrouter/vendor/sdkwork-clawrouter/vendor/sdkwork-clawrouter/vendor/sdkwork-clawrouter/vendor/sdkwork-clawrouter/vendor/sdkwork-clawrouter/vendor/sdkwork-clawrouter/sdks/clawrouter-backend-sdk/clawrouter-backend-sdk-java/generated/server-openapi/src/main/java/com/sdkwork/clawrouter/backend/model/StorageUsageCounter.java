package com.sdkwork.clawrouter.backend.model;


public class StorageUsageCounter {
    private String fileCount;
    private String files;
    private String id;
    private String reserved;
    private String reservedBytes;
    private String scope;
    private String scopeId;
    private String scopeType;
    private String snapshotAt;
    private String updatedAt;
    private String used;
    private String usedBytes;

    public String getFileCount() {
        return this.fileCount;
    }

    public void setFileCount(String fileCount) {
        this.fileCount = fileCount;
    }

    public String getFiles() {
        return this.files;
    }

    public void setFiles(String files) {
        this.files = files;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getReserved() {
        return this.reserved;
    }

    public void setReserved(String reserved) {
        this.reserved = reserved;
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
