package com.sdkwork.clawrouter.backend.model;


public class ModelRankingRefreshTriggerRequest {
    private String cacheMaxAgeSeconds;
    private String limit;
    private String lookbackDays;
    private String rankScope;
    private String refreshIntervalSeconds;
    private String snapshotPeriod;

    public String getCacheMaxAgeSeconds() {
        return this.cacheMaxAgeSeconds;
    }

    public void setCacheMaxAgeSeconds(String cacheMaxAgeSeconds) {
        this.cacheMaxAgeSeconds = cacheMaxAgeSeconds;
    }

    public String getLimit() {
        return this.limit;
    }

    public void setLimit(String limit) {
        this.limit = limit;
    }

    public String getLookbackDays() {
        return this.lookbackDays;
    }

    public void setLookbackDays(String lookbackDays) {
        this.lookbackDays = lookbackDays;
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

    public String getSnapshotPeriod() {
        return this.snapshotPeriod;
    }

    public void setSnapshotPeriod(String snapshotPeriod) {
        this.snapshotPeriod = snapshotPeriod;
    }
}
