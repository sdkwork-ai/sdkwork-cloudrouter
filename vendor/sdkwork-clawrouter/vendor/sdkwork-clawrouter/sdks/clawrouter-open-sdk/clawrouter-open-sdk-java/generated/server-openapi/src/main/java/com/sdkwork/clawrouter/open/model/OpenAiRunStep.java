package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiRunStep {
    private String assistantId;
    private Integer cancelledAt;
    private Integer completedAt;
    private Integer createdAt;
    private Integer expiredAt;
    private Integer failedAt;
    private String id;
    private String lastError;
    private Map<String, String> metadata;
    private String object;
    private String runId;
    private String status;
    private String stepDetails;
    private String threadId;
    private String type;
    private OpenAiTokenUsage usage;

    public String getAssistantId() {
        return this.assistantId;
    }

    public void setAssistantId(String assistantId) {
        this.assistantId = assistantId;
    }

    public Integer getCancelledAt() {
        return this.cancelledAt;
    }

    public void setCancelledAt(Integer cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public Integer getCompletedAt() {
        return this.completedAt;
    }

    public void setCompletedAt(Integer completedAt) {
        this.completedAt = completedAt;
    }

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getExpiredAt() {
        return this.expiredAt;
    }

    public void setExpiredAt(Integer expiredAt) {
        this.expiredAt = expiredAt;
    }

    public Integer getFailedAt() {
        return this.failedAt;
    }

    public void setFailedAt(Integer failedAt) {
        this.failedAt = failedAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLastError() {
        return this.lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
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

    public String getRunId() {
        return this.runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStepDetails() {
        return this.stepDetails;
    }

    public void setStepDetails(String stepDetails) {
        this.stepDetails = stepDetails;
    }

    public String getThreadId() {
        return this.threadId;
    }

    public void setThreadId(String threadId) {
        this.threadId = threadId;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public OpenAiTokenUsage getUsage() {
        return this.usage;
    }

    public void setUsage(OpenAiTokenUsage usage) {
        this.usage = usage;
    }
}
