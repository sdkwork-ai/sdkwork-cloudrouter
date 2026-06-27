package com.sdkwork.clawrouter.backend.model;


public class AdminAnalyticsSummary {
    private String activeModels;
    private String activeUsers;
    private Double averagePointsPerRequest;
    private Double averageTokensPerRequest;
    private Double errorRate;
    private String failedRequests;
    private String successfulRequests;
    private Double totalPoints;
    private String totalRequests;
    private Double totalTokens;
    private String totalUsers;
    private Double upstreamCost;

    public String getActiveModels() {
        return this.activeModels;
    }

    public void setActiveModels(String activeModels) {
        this.activeModels = activeModels;
    }

    public String getActiveUsers() {
        return this.activeUsers;
    }

    public void setActiveUsers(String activeUsers) {
        this.activeUsers = activeUsers;
    }

    public Double getAveragePointsPerRequest() {
        return this.averagePointsPerRequest;
    }

    public void setAveragePointsPerRequest(Double averagePointsPerRequest) {
        this.averagePointsPerRequest = averagePointsPerRequest;
    }

    public Double getAverageTokensPerRequest() {
        return this.averageTokensPerRequest;
    }

    public void setAverageTokensPerRequest(Double averageTokensPerRequest) {
        this.averageTokensPerRequest = averageTokensPerRequest;
    }

    public Double getErrorRate() {
        return this.errorRate;
    }

    public void setErrorRate(Double errorRate) {
        this.errorRate = errorRate;
    }

    public String getFailedRequests() {
        return this.failedRequests;
    }

    public void setFailedRequests(String failedRequests) {
        this.failedRequests = failedRequests;
    }

    public String getSuccessfulRequests() {
        return this.successfulRequests;
    }

    public void setSuccessfulRequests(String successfulRequests) {
        this.successfulRequests = successfulRequests;
    }

    public Double getTotalPoints() {
        return this.totalPoints;
    }

    public void setTotalPoints(Double totalPoints) {
        this.totalPoints = totalPoints;
    }

    public String getTotalRequests() {
        return this.totalRequests;
    }

    public void setTotalRequests(String totalRequests) {
        this.totalRequests = totalRequests;
    }

    public Double getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(Double totalTokens) {
        this.totalTokens = totalTokens;
    }

    public String getTotalUsers() {
        return this.totalUsers;
    }

    public void setTotalUsers(String totalUsers) {
        this.totalUsers = totalUsers;
    }

    public Double getUpstreamCost() {
        return this.upstreamCost;
    }

    public void setUpstreamCost(Double upstreamCost) {
        this.upstreamCost = upstreamCost;
    }
}
