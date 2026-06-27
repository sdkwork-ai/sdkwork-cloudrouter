package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAnalyticsUserRankItem {
    private String email;
    private List<AdminPieChartItem> modelDistribution;
    private Double points;
    private String rank;
    private String requestCount;
    private Double totalTokens;
    private String userId;
    private String userName;

    public String getEmail() {
        return this.email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public List<AdminPieChartItem> getModelDistribution() {
        return this.modelDistribution;
    }

    public void setModelDistribution(List<AdminPieChartItem> modelDistribution) {
        this.modelDistribution = modelDistribution;
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

    public String getUserId() {
        return this.userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return this.userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }
}
