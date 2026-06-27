package com.sdkwork.clawrouter.backend.model;


public class AdminDashboardTrafficItem {
    private Double cost;
    private Double requests;
    private String time;
    private Double tokens;

    public Double getCost() {
        return this.cost;
    }

    public void setCost(Double cost) {
        this.cost = cost;
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
}
