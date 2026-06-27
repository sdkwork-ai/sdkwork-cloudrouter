package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAnalyticsModelRankings {
    private List<AdminAnalyticsModelRankItem> points;
    private List<AdminAnalyticsModelRankItem> requests;
    private List<AdminAnalyticsModelRankItem> tokens;

    public List<AdminAnalyticsModelRankItem> getPoints() {
        return this.points;
    }

    public void setPoints(List<AdminAnalyticsModelRankItem> points) {
        this.points = points;
    }

    public List<AdminAnalyticsModelRankItem> getRequests() {
        return this.requests;
    }

    public void setRequests(List<AdminAnalyticsModelRankItem> requests) {
        this.requests = requests;
    }

    public List<AdminAnalyticsModelRankItem> getTokens() {
        return this.tokens;
    }

    public void setTokens(List<AdminAnalyticsModelRankItem> tokens) {
        this.tokens = tokens;
    }
}
