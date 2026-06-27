package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class ModelRankingsSource {
    private String cacheMaxAgeSeconds;
    private String generatedAt;
    private String nextRefreshAt;
    private String observedAt;
    private String rankScope;
    private String refreshIntervalSeconds;
    private String snapshotDate;
    private String snapshotPeriod;
    private String sourceDescription;
    private String sourceLabel;
    private List<String> sourceTables;
    private String windowEnd;
    private String windowStart;

    public String getCacheMaxAgeSeconds() {
        return this.cacheMaxAgeSeconds;
    }

    public void setCacheMaxAgeSeconds(String cacheMaxAgeSeconds) {
        this.cacheMaxAgeSeconds = cacheMaxAgeSeconds;
    }

    public String getGeneratedAt() {
        return this.generatedAt;
    }

    public void setGeneratedAt(String generatedAt) {
        this.generatedAt = generatedAt;
    }

    public String getNextRefreshAt() {
        return this.nextRefreshAt;
    }

    public void setNextRefreshAt(String nextRefreshAt) {
        this.nextRefreshAt = nextRefreshAt;
    }

    public String getObservedAt() {
        return this.observedAt;
    }

    public void setObservedAt(String observedAt) {
        this.observedAt = observedAt;
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

    public String getSourceDescription() {
        return this.sourceDescription;
    }

    public void setSourceDescription(String sourceDescription) {
        this.sourceDescription = sourceDescription;
    }

    public String getSourceLabel() {
        return this.sourceLabel;
    }

    public void setSourceLabel(String sourceLabel) {
        this.sourceLabel = sourceLabel;
    }

    public List<String> getSourceTables() {
        return this.sourceTables;
    }

    public void setSourceTables(List<String> sourceTables) {
        this.sourceTables = sourceTables;
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
