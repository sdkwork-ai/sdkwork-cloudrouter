package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiOrganizationUsageBucket {
    private Integer endTime;
    private Integer inputTokens;
    private Integer numRequests;
    private String object;
    private Integer outputTokens;
    private List<String> results;
    private Integer startTime;

    public Integer getEndTime() {
        return this.endTime;
    }

    public void setEndTime(Integer endTime) {
        this.endTime = endTime;
    }

    public Integer getInputTokens() {
        return this.inputTokens;
    }

    public void setInputTokens(Integer inputTokens) {
        this.inputTokens = inputTokens;
    }

    public Integer getNumRequests() {
        return this.numRequests;
    }

    public void setNumRequests(Integer numRequests) {
        this.numRequests = numRequests;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public Integer getOutputTokens() {
        return this.outputTokens;
    }

    public void setOutputTokens(Integer outputTokens) {
        this.outputTokens = outputTokens;
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
