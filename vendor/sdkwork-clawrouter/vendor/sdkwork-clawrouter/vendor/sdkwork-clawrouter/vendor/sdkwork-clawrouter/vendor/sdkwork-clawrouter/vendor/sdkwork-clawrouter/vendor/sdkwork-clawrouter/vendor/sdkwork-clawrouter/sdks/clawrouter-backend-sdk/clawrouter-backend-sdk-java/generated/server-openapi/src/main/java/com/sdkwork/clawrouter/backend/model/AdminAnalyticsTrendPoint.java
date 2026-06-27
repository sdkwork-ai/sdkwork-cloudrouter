package com.sdkwork.clawrouter.backend.model;


public class AdminAnalyticsTrendPoint {
    private Double points;
    private Double requests;
    private String time;
    private Double tokens;
    private String users;

    public Double getPoints() {
        return this.points;
    }

    public void setPoints(Double points) {
        this.points = points;
    }

    public Double getRequests() {
        return this.requests;
    }

    public void setRequests(Double requests) {
        this.requests = requests;
    }

    public String getTime() {
        return this.time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public Double getTokens() {
        return this.tokens;
    }

    public void setTokens(Double tokens) {
        this.tokens = tokens;
    }

    public String getUsers() {
        return this.users;
    }

    public void setUsers(String users) {
        this.users = users;
    }
}
