package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class BlackForestLabsImageGenerationTask {
    private Map<String, String> details;
    private String id;
    private String pollingUrl;
    private Double progress;
    private Map<String, String> result;
    private String status;

    public Map<String, String> getDetails() {
        return this.details;
    }

    public void setDetails(Map<String, String> details) {
        this.details = details;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPollingUrl() {
        return this.pollingUrl;
    }

    public void setPollingUrl(String pollingUrl) {
        this.pollingUrl = pollingUrl;
    }

    public Double getProgress() {
        return this.progress;
    }

    public void setProgress(Double progress) {
        this.progress = progress;
    }

    public Map<String, String> getResult() {
        return this.result;
    }

    public void setResult(Map<String, String> result) {
        this.result = result;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
