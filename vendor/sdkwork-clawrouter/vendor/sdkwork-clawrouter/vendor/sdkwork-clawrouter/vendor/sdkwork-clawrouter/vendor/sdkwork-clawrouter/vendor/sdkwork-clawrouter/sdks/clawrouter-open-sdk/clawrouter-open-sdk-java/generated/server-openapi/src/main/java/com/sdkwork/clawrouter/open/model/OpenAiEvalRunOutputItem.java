package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiEvalRunOutputItem {
    private Integer createdAt;
    private String evalId;
    private String id;
    private Map<String, String> metadata;
    private String object;
    private List<String> results;
    private String runId;
    private String sample;
    private String status;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getEvalId() {
        return this.evalId;
    }

    public void setEvalId(String evalId) {
        this.evalId = evalId;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
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

    public String getRunId() {
        return this.runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public String getSample() {
        return this.sample;
    }

    public void setSample(String sample) {
        this.sample = sample;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
