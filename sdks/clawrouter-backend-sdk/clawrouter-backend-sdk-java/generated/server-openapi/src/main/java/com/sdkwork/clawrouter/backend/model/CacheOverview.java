package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class CacheOverview {
    private List<Map<String, Object>> instances;
    private List<Map<String, Object>> namespacePolicies;
    private Map<String, Object> summary;

    public List<Map<String, Object>> getInstances() {
        return this.instances;
    }

    public void setInstances(List<Map<String, Object>> instances) {
        this.instances = instances;
    }

    public List<Map<String, Object>> getNamespacePolicies() {
        return this.namespacePolicies;
    }

    public void setNamespacePolicies(List<Map<String, Object>> namespacePolicies) {
        this.namespacePolicies = namespacePolicies;
    }

    public Map<String, Object> getSummary() {
        return this.summary;
    }

    public void setSummary(Map<String, Object> summary) {
        this.summary = summary;
    }
}
