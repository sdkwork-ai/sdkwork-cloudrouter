package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiOrganizationCostBucket {
    private Double amount;
    private String currency;
    private Integer endTime;
    private String object;
    private List<String> results;
    private Integer startTime;

    public Double getAmount() {
        return this.amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return this.currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Integer getEndTime() {
        return this.endTime;
    }

    public void setEndTime(Integer endTime) {
        this.endTime = endTime;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public List<String> getResults() {
        return this.results;
    }

    public void setResults(List<String> results) {
        this.results = results;
    }

    public Integer getStartTime() {
        return this.startTime;
    }

    public void setStartTime(Integer startTime) {
        this.startTime = startTime;
    }
}
