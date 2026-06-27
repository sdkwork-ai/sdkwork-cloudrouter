package com.sdkwork.clawrouter.backend.model;


public class ModelRankingRefreshTriggerResponse {
    private String cacheMaxAgeSeconds;
    private String generatedCount;
    private String nextRefreshAt;
    private String organizationId;
    private String rankScope;
    private String refreshIntervalSeconds;
    private String snapshotDate;
    private String snapshotPeriod;
    private String sourceCount;
    private String status;
    private String tenantId;
    private Boolean triggered;
    private String windowEnd;
    private String windowStart;

    public String getCacheMaxAgeSeconds() {
        return this.cacheMaxAgeSeconds;
    }

    public void setCacheMaxAgeSeconds(String cacheMaxAgeSeconds) {
        this.cacheMaxAgeSeconds = cacheMaxAgeSeconds;
    }

    public String getGeneratedCount() {
        return this.generatedCount;
    }

    public void setGeneratedCount(String generatedCount) {
        this.generatedCount = generatedCount;
    }

    public String getNextRefreshAt() {
        return this.nextRefreshAt;
    }

    public void setNextRefreshAt(String nextRefreshAt) {
        this.nextRefreshAt = nextRefreshAt;
    }

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getRankScope() {
        return this.rankScope;
    }

    public void setRankScope(String rankScope) {
        this.rankScope = rankScope;
    }

    public String getRefreshIntervalSeconds() {
        return this.refreshIntervalSeconds;
    }

    public void setRefreshIntervalSeconds(String refreshIntervalSeconds) {
        this.refreshIntervalSeconds = refreshIntervalSeconds;
    }

    public String getSnapshotDate() {
        return this.snapshotDate;
    }

    public void setSnapshotDate(String snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public String getSnapshotPeriod() {
        return this.snapshotPeriod;
    }

    public void setSnapshotPeriod(String snapshotPeriod) {
        this.snapshotPeriod = snapshotPeriod;
    }

    public String getSourceCount() {
        return this.sourceCount;
    }

    public void setSourceCount(String sourceCount) {
        this.sourceCount = sourceCount;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTenantId() {
        return this.tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public Boolean getTriggered() {
        return this.triggered;
    }

    public void setTriggered(Boolean triggered) {
        this.triggered = triggered;
    }

    public String getWindowEnd() {
        return this.windowEnd;
    }

    public void setWindowEnd(String windowEnd) {
        this.windowEnd = windowEnd;
    }

    public String getWindowStart() {
        return this.windowStart;
    }

    public void setWindowStart(String windowStart) {
        this.windowStart = windowStart;
    }
}
