package com.sdkwork.clawrouter.backend.model;


public class CacheOperationOutcome {
    private String cacheKey;
    private String deletedEntries;
    private String instanceName;
    private String namespace;
    private String operation;
    private String refreshedEntries;
    private String status;

    public String getCacheKey() {
        return this.cacheKey;
    }

    public void setCacheKey(String cacheKey) {
        this.cacheKey = cacheKey;
    }

    public String getDeletedEntries() {
        return this.deletedEntries;
    }

    public void setDeletedEntries(String deletedEntries) {
        this.deletedEntries = deletedEntries;
    }

    public String getInstanceName() {
        return this.instanceName;
    }

    public void setInstanceName(String instanceName) {
        this.instanceName = instanceName;
    }

    public String getNamespace() {
        return this.namespace;
    }

    public void setNamespace(String namespace) {
        this.namespace = namespace;
    }

    public String getOperation() {
        return this.operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public String getRefreshedEntries() {
        return this.refreshedEntries;
    }

    public void setRefreshedEntries(String refreshedEntries) {
        this.refreshedEntries = refreshedEntries;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
