package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiBatch {
    private Integer cancelledAt;
    private Integer cancellingAt;
    private Integer completedAt;
    private String completionWindow;
    private Integer createdAt;
    private String endpoint;
    private String errorFileId;
    private String errors;
    private Integer expiredAt;
    private Integer expiresAt;
    private Integer failedAt;
    private Integer finalizingAt;
    private String id;
    private Integer inProgressAt;
    private String inputFileId;
    private Map<String, String> metadata;
    private String object;
    private String outputFileId;
    private OpenAiBatchRequestCounts requestCounts;
    private String status;

    public Integer getCancelledAt() {
        return this.cancelledAt;
    }

    public void setCancelledAt(Integer cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public Integer getCancellingAt() {
        return this.cancellingAt;
    }

    public void setCancellingAt(Integer cancellingAt) {
        this.cancellingAt = cancellingAt;
    }

    public Integer getCompletedAt() {
        return this.completedAt;
    }

    public void setCompletedAt(Integer completedAt) {
        this.completedAt = completedAt;
    }

    public String getCompletionWindow() {
        return this.completionWindow;
    }

    public void setCompletionWindow(String completionWindow) {
        this.completionWindow = completionWindow;
    }

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getEndpoint() {
        return this.endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getErrorFileId() {
        return this.errorFileId;
    }

    public void setErrorFileId(String errorFileId) {
        this.errorFileId = errorFileId;
    }

    public String getErrors() {
        return this.errors;
    }

    public void setErrors(String errors) {
        this.errors = errors;
    }

    public Integer getExpiredAt() {
        return this.expiredAt;
    }

    public void setExpiredAt(Integer expiredAt) {
        this.expiredAt = expiredAt;
    }

    public Integer getExpiresAt() {
        return this.expiresAt;
    }

    public void setExpiresAt(Integer expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Integer getFailedAt() {
        return this.failedAt;
    }

    public void setFailedAt(Integer failedAt) {
        this.failedAt = failedAt;
    }

    public Integer getFinalizingAt() {
        return this.finalizingAt;
    }

    public void setFinalizingAt(Integer finalizingAt) {
        this.finalizingAt = finalizingAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getInProgressAt() {
        return this.inProgressAt;
    }

    public void setInProgressAt(Integer inProgressAt) {
        this.inProgressAt = inProgressAt;
    }

    public String getInputFileId() {
        return this.inputFileId;
    }

    public void setInputFileId(String inputFileId) {
        this.inputFileId = inputFileId;
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

    public String getOutputFileId() {
        return this.outputFileId;
    }

    public void setOutputFileId(String outputFileId) {
        this.outputFileId = outputFileId;
    }

    public OpenAiBatchRequestCounts getRequestCounts() {
        return this.requestCounts;
    }

    public void setRequestCounts(OpenAiBatchRequestCounts requestCounts) {
        this.requestCounts = requestCounts;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
