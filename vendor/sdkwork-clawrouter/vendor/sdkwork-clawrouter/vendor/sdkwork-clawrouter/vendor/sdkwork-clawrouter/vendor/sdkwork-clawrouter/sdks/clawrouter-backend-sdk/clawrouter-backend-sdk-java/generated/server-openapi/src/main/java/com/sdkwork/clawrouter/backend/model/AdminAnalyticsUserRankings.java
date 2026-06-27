package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAnalyticsUserRankings {
    private List<AdminAnalyticsUserRankItem> points;
    private List<AdminAnalyticsUserRankItem> requests;
    private List<AdminAnalyticsUserRankItem> tokens;

    public List<AdminAnalyticsUserRankItem> getPoints() {
        return this.points;
    }

    public void setPoints(List<AdminAnalyticsUserRankItem> points) {
        this.points = points;
    }

    public List<AdminAnalyticsUserRankItem> getRequests() {
        return this.requests;
    }

    public void setRequests(List<AdminAnalyticsUserRankItem> requests) {
        this.requests = requests;
    }

    public List<AdminAnalyticsUserRankItem> getTokens() {
        return this.tokens;
    }

    public void setTokens(List<AdminAnalyticsUserRankItem> tokens) {
        this.tokens = tokens;
    }
}
