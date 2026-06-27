package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminCacheOverviewResponse {
    private List<AdminCacheInstance> instances;
    private List<AdminCacheNamespacePolicy> namespacePolicies;
    private AdminCacheSummary summary;

    public List<AdminCacheInstance> getInstances() {
        return this.instances;
    }

    public void setInstances(List<AdminCacheInstance> instances) {
        this.instances = instances;
    }

    public List<AdminCacheNamespacePolicy> getNamespacePolicies() {
        return this.namespacePolicies;
    }

    public void setNamespacePolicies(List<AdminCacheNamespacePolicy> namespacePolicies) {
        this.namespacePolicies = namespacePolicies;
    }

    public AdminCacheSummary getSummary() {
        return this.summary;
    }

    public void setSummary(AdminCacheSummary summary) {
        this.summary = summary;
    }
}
