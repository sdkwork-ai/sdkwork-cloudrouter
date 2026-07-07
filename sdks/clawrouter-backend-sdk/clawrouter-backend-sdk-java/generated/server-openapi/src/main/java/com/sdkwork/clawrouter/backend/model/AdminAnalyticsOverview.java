package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class AdminAnalyticsOverview {
    private String endTime;
    private List<Map<String, Object>> insights;
    private List<Map<String, Object>> modalityDistribution;
    private List<Map<String, Object>> modelDistribution;
    private Map<String, Object> modelRankings;
    private Integer rankingSize;
    private String startTime;
    private Map<String, Object> summary;
    private String timeRange;
    private List<Map<String, Object>> trend;
    private Map<String, Object> userRankings;

    public String getEndTime() {
        return this.endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public List<Map<String, Object>> getInsights() {
        return this.insights;
    }

    public void setInsights(List<Map<String, Object>> insights) {
        this.insights = insights;
    }

    public List<Map<String, Object>> getModalityDistribution() {
        return this.modalityDistribution;
    }

    public void setModalityDistribution(List<Map<String, Object>> modalityDistribution) {
        this.modalityDistribution = modalityDistribution;
    }

    public List<Map<String, Object>> getModelDistribution() {
        return this.modelDistribution;
    }

    public void setModelDistribution(List<Map<String, Object>> modelDistribution) {
        this.modelDistribution = modelDistribution;
    }

    public Map<String, Object> getModelRankings() {
        return this.modelRankings;
    }

    public void setModelRankings(Map<String, Object> modelRankings) {
        this.modelRankings = modelRankings;
    }

    public Integer getRankingSize() {
        return this.rankingSize;
    }

    public void setRankingSize(Integer rankingSize) {
        this.rankingSize = rankingSize;
    }

    public String getStartTime() {
        return this.startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public Map<String, Object> getSummary() {
        return this.summary;
    }

    public void setSummary(Map<String, Object> summary) {
        this.summary = summary;
    }

    public String getTimeRange() {
        return this.timeRange;
    }

    public void setTimeRange(String timeRange) {
        this.timeRange = timeRange;
    }

    public List<Map<String, Object>> getTrend() {
        return this.trend;
    }

    public void setTrend(List<Map<String, Object>> trend) {
        this.trend = trend;
    }

    public Map<String, Object> getUserRankings() {
        return this.userRankings;
    }

    public void setUserRankings(Map<String, Object> userRankings) {
        this.userRankings = userRankings;
    }
}
