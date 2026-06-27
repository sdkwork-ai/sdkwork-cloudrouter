package com.sdkwork.clawrouter.open.model;


public class AnthropicMessageBatch {
    private String cancelInitiatedAt;
    private String createdAt;
    private String endedAt;
    private String expiresAt;
    private String id;
    private String processingStatus;
    private AnthropicMessageBatchRequestCounts requestCounts;
    private String resultsUrl;
    private String type;

    public String getCancelInitiatedAt() {
        return this.cancelInitiatedAt;
    }

    public void setCancelInitiatedAt(String cancelInitiatedAt) {
        this.cancelInitiatedAt = cancelInitiatedAt;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getEndedAt() {
        return this.endedAt;
    }

    public void setEndedAt(String endedAt) {
        this.endedAt = endedAt;
    }

    public String getExpiresAt() {
        return this.expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProcessingStatus() {
        return this.processingStatus;
    }

    public void setProcessingStatus(String processingStatus) {
        this.processingStatus = processingStatus;
    }

    public AnthropicMessageBatchRequestCounts getRequestCounts() {
        return this.requestCounts;
    }

    public void setRequestCounts(AnthropicMessageBatchRequestCounts requestCounts) {
        this.requestCounts = requestCounts;
    }

    public String getResultsUrl() {
        return this.resultsUrl;
    }

    public void setResultsUrl(String resultsUrl) {
        this.resultsUrl = resultsUrl;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
