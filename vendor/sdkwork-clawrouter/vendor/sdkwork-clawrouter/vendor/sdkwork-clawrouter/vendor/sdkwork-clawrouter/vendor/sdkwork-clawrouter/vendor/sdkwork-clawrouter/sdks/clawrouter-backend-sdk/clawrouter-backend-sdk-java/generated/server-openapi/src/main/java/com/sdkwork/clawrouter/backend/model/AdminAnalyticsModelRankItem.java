package com.sdkwork.clawrouter.backend.model;


public class AdminAnalyticsModelRankItem {
    private Double averageTokensPerRequest;
    private String catalogKey;
    private Double errorRate;
    private String modality;
    private String model;
    private Double points;
    private String rank;
    private String requestCount;
    private Double totalTokens;
    private Double upstreamCost;
    private String userCount;
    private String vendor;

    public Double getAverageTokensPerRequest() {
        return this.averageTokensPerRequest;
    }

    public void setAverageTokensPerRequest(Double averageTokensPerRequest) {
        this.averageTokensPerRequest = averageTokensPerRequest;
    }

    public String getCatalogKey() {
        return this.catalogKey;
    }

    public void setCatalogKey(String catalogKey) {
        this.catalogKey = catalogKey;
    }

    public Double getErrorRate() {
        return this.errorRate;
    }

    public void setErrorRate(Double errorRate) {
        this.errorRate = errorRate;
    }

    public String getModality() {
        return this.modality;
    }

    public void setModality(String modality) {
        this.modality = modality;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Double getPoints() {
        return this.points;
    }

    public void setPoints(Double points) {
        this.points = points;
    }

    public String getRank() {
        return this.rank;
    }

    public void setRank(String rank) {
        this.rank = rank;
    }

    public String getRequestCount() {
        return this.requestCount;
    }

    public void setRequestCount(String requestCount) {
        this.requestCount = requestCount;
    }

    public Double getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(Double totalTokens) {
        this.totalTokens = totalTokens;
    }

    public Double getUpstreamCost() {
        return this.upstreamCost;
    }

    public void setUpstreamCost(Double upstreamCost) {
        this.upstreamCost = upstreamCost;
    }

    public String getUserCount() {
        return this.userCount;
    }

    public void setUserCount(String userCount) {
        this.userCount = userCount;
    }

    public String getVendor() {
        return this.vendor;
    }

    public void setVendor(String vendor) {
        this.vendor = vendor;
    }
}
