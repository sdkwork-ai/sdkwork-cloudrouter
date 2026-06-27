package com.sdkwork.clawrouter.backend.model;


public class AdminCacheSummary {
    private String cacheDeletes;
    private String cacheErrors;
    private String cacheHits;
    private String cacheInspections;
    private String cacheMisses;
    private String cacheRefreshes;
    private String cacheWrites;
    private String expiredEntries;
    private String runtimeTarget;
    private String totalEntries;
    private String totalInstances;
    private String totalNamespaces;

    public String getCacheDeletes() {
        return this.cacheDeletes;
    }

    public void setCacheDeletes(String cacheDeletes) {
        this.cacheDeletes = cacheDeletes;
    }

    public String getCacheErrors() {
        return this.cacheErrors;
    }

    public void setCacheErrors(String cacheErrors) {
        this.cacheErrors = cacheErrors;
    }

    public String getCacheHits() {
        return this.cacheHits;
    }

    public void setCacheHits(String cacheHits) {
        this.cacheHits = cacheHits;
    }

    public String getCacheInspections() {
        return this.cacheInspections;
    }

    public void setCacheInspections(String cacheInspections) {
        this.cacheInspections = cacheInspections;
    }

    public String getCacheMisses() {
        return this.cacheMisses;
    }

    public void setCacheMisses(String cacheMisses) {
        this.cacheMisses = cacheMisses;
    }

    public String getCacheRefreshes() {
        return this.cacheRefreshes;
    }

    public void setCacheRefreshes(String cacheRefreshes) {
        this.cacheRefreshes = cacheRefreshes;
    }

    public String getCacheWrites() {
        return this.cacheWrites;
    }

    public void setCacheWrites(String cacheWrites) {
        this.cacheWrites = cacheWrites;
    }

    public String getExpiredEntries() {
        return this.expiredEntries;
    }

    public void setExpiredEntries(String expiredEntries) {
        this.expiredEntries = expiredEntries;
    }

    public String getRuntimeTarget() {
        return this.runtimeTarget;
    }

    public void setRuntimeTarget(String runtimeTarget) {
        this.runtimeTarget = runtimeTarget;
    }

    public String getTotalEntries() {
        return this.totalEntries;
    }

    public void setTotalEntries(String totalEntries) {
        this.totalEntries = totalEntries;
    }

    public String getTotalInstances() {
        return this.totalInstances;
    }

    public void setTotalInstances(String totalInstances) {
        this.totalInstances = totalInstances;
    }

    public String getTotalNamespaces() {
        return this.totalNamespaces;
    }

    public void setTotalNamespaces(String totalNamespaces) {
        this.totalNamespaces = totalNamespaces;
    }
}
