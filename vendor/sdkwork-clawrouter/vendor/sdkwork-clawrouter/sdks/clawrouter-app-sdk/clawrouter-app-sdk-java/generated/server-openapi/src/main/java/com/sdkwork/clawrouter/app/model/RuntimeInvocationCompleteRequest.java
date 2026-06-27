package com.sdkwork.clawrouter.app.model;

import java.util.Map;

public class RuntimeInvocationCompleteRequest {
    private String errorCode;
    private String errorMessageMasked;
    private String errorType;
    private String exitCode;
    private String finishReason;
    private String latencyMs;
    private Map<String, String> metadata;
    private String providerConversationId;
    private String providerResponseId;
    private String providerSessionId;
    private String providerStepId;
    private Map<String, String> responseJson;
    private String status;
    private String ttftMs;
    private UsageSnapshot usageJson;

    public String getErrorCode() {
        return this.errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorMessageMasked() {
        return this.errorMessageMasked;
    }

    public void setErrorMessageMasked(String errorMessageMasked) {
        this.errorMessageMasked = errorMessageMasked;
    }

    public String getErrorType() {
        return this.errorType;
    }

    public void setErrorType(String errorType) {
        this.errorType = errorType;
    }

    public String getExitCode() {
        return this.exitCode;
    }

    public void setExitCode(String exitCode) {
        this.exitCode = exitCode;
    }

    public String getFinishReason() {
        return this.finishReason;
    }

    public void setFinishReason(String finishReason) {
        this.finishReason = finishReason;
    }

    public String getLatencyMs() {
        return this.latencyMs;
    }

    public void setLatencyMs(String latencyMs) {
        this.latencyMs = latencyMs;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getProviderConversationId() {
        return this.providerConversationId;
    }

    public void setProviderConversationId(String providerConversationId) {
        this.providerConversationId = providerConversationId;
    }

    public String getProviderResponseId() {
        return this.providerResponseId;
    }

    public void setProviderResponseId(String providerResponseId) {
        this.providerResponseId = providerResponseId;
    }

    public String getProviderSessionId() {
        return this.providerSessionId;
    }

    public void setProviderSessionId(String providerSessionId) {
        this.providerSessionId = providerSessionId;
    }

    public String getProviderStepId() {
        return this.providerStepId;
    }

    public void setProviderStepId(String providerStepId) {
        this.providerStepId = providerStepId;
    }

    public Map<String, String> getResponseJson() {
        return this.responseJson;
    }

    public void setResponseJson(Map<String, String> responseJson) {
        this.responseJson = responseJson;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTtftMs() {
        return this.ttftMs;
    }

    public void setTtftMs(String ttftMs) {
        this.ttftMs = ttftMs;
    }

    public UsageSnapshot getUsageJson() {
        return this.usageJson;
    }

    public void setUsageJson(UsageSnapshot usageJson) {
        this.usageJson = usageJson;
    }
}
