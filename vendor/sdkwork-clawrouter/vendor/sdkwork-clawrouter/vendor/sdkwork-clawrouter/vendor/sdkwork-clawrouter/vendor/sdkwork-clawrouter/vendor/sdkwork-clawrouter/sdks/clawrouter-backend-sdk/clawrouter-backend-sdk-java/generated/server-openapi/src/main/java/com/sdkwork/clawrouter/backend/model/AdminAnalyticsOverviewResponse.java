package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAnalyticsOverviewResponse {
    private String endTime;
    private List<AdminAnalyticsInsight> insights;
    private String limit;
    private List<AdminPieChartItem> modalityDistribution;
    private List<AdminPieChartItem> modelDistribution;
    private AdminAnalyticsModelRankings modelRankings;
    private String startTime;
    private AdminAnalyticsSummary summary;
    private String timeRange;
    private List<AdminAnalyticsTrendPoint> trend;
    private AdminAnalyticsUserRankings userRankings;

    public String getEndTime() {
        return this.endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public List<AdminAnalyticsInsight> getInsights() {
        return this.insights;
    }

    public void setInsights(List<AdminAnalyticsInsight> insights) {
        this.insights = insights;
    }

    public String getLimit() {
        return this.limit;
    }

    public void setLimit(String limit) {
        this.limit = limit;
    }

    public List<AdminPieChartItem> getModalityDistribution() {
        return this.modalityDistribution;
    }

    public void setModalityDistribution(List<AdminPieChartItem> modalityDistribution) {
        this.modalityDistribution = modalityDistribution;
    }

    public List<AdminPieChartItem> getModelDistribution() {
        return this.modelDistribution;
    }

    public void setModelDistribution(List<AdminPieChartItem> modelDistribution) {
        this.modelDistribution = modelDistribution;
    }

    public AdminAnalyticsModelRankings getModelRankings() {
        return this.modelRankings;
    }

    public void setModelRankings(AdminAnalyticsModelRankings modelRankings) {
        this.modelRankings = modelRankings;
    }

    public String getStartTime() {
        return this.startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public AdminAnalyticsSummary getSummary() {
        return this.summary;
    }

    public void setSummary(AdminAnalyticsSummary summary) {
        this.summary = summary;
    }

    public String getTimeRange() {
        return this.timeRange;
    }

    public void setTimeRange(String timeRange) {
        this.timeRange = timeRange;
    }

    public List<AdminAnalyticsTrendPoint> getTrend() {
        return this.trend;
    }

    public void setTrend(List<AdminAnalyticsTrendPoint> trend) {
        this.trend = trend;
    }

    public AdminAnalyticsUserRankings getUserRankings() {
        return this.userRankings;
    }

    public void setUserRankings(AdminAnalyticsUserRankings userRankings) {
        this.userRankings = userRankings;
    }
}
