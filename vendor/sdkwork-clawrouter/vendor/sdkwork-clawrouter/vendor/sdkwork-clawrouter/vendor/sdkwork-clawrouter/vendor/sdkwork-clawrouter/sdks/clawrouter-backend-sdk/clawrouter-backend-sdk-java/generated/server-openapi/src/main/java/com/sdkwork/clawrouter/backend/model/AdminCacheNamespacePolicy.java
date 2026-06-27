package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminCacheNamespacePolicy {
    private String consistency;
    private Boolean enabled;
    private String failureMode;
    private String instanceName;
    private String jitterPercent;
    private String namespace;
    private String scope;
    private String sensitivity;
    private String staleWhileRevalidateSeconds;
    private List<String> tags;
    private String ttlSeconds;

    public String getConsistency() {
        return this.consistency;
    }

    public void setConsistency(String consistency) {
        this.consistency = consistency;
    }

    public Boolean getEnabled() {
        return this.enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getFailureMode() {
        return this.failureMode;
    }

    public void setFailureMode(String failureMode) {
        this.failureMode = failureMode;
    }

    public String getInstanceName() {
        return this.instanceName;
    }

    public void setInstanceName(String instanceName) {
        this.instanceName = instanceName;
    }

    public String getJitterPercent() {
        return this.jitterPercent;
    }

    public void setJitterPercent(String jitterPercent) {
        this.jitterPercent = jitterPercent;
    }

    public String getNamespace() {
        return this.namespace;
    }

    public void setNamespace(String namespace) {
        this.namespace = namespace;
    }

    public String getScope() {
        return this.scope;
    }

    public void setScope(String scope) {
        this.scope = scope;
    }

    public String getSensitivity() {
        return this.sensitivity;
    }

    public void setSensitivity(String sensitivity) {
        this.sensitivity = sensitivity;
    }

    public String getStaleWhileRevalidateSeconds() {
        return this.staleWhileRevalidateSeconds;
    }

    public void setStaleWhileRevalidateSeconds(String staleWhileRevalidateSeconds) {
        this.staleWhileRevalidateSeconds = staleWhileRevalidateSeconds;
    }

    public List<String> getTags() {
        return this.tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getTtlSeconds() {
        return this.ttlSeconds;
    }

    public void setTtlSeconds(String ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
    }
}
