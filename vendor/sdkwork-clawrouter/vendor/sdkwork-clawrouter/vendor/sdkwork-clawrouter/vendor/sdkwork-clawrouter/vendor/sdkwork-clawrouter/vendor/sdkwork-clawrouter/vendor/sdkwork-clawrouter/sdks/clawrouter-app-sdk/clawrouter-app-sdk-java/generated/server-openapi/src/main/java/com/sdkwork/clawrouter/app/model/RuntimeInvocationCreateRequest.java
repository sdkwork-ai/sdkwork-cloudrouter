package com.sdkwork.clawrouter.app.model;

import java.util.Map;

public class RuntimeInvocationCreateRequest {
    private String agentRunId;
    private String agentRunStepId;
    private String agentSessionId;
    private String approvalPolicy;
    private String chatItemId;
    private String chatTurnId;
    private String conversationId;
    private String cwd;
    private String endpoint;
    private String invocationType;
    private Map<String, String> metadata;
    private String model;
    private String permissionMode;
    private String provider;
    private Map<String, String> requestJson;
    private String runtime;
    private String sandboxPolicy;
    private String status;
    private Boolean streaming;
    private String toolCallId;
    private String toolName;
    private String traceId;

    public String getAgentRunId() {
        return this.agentRunId;
    }

    public void setAgentRunId(String agentRunId) {
        this.agentRunId = agentRunId;
    }

    public String getAgentRunStepId() {
        return this.agentRunStepId;
    }

    public void setAgentRunStepId(String agentRunStepId) {
        this.agentRunStepId = agentRunStepId;
    }

    public String getAgentSessionId() {
        return this.agentSessionId;
    }

    public void setAgentSessionId(String agentSessionId) {
        this.agentSessionId = agentSessionId;
    }

    public String getApprovalPolicy() {
        return this.approvalPolicy;
    }

    public void setApprovalPolicy(String approvalPolicy) {
        this.approvalPolicy = approvalPolicy;
    }

    public String getChatItemId() {
        return this.chatItemId;
    }

    public void setChatItemId(String chatItemId) {
        this.chatItemId = chatItemId;
    }

    public String getChatTurnId() {
        return this.chatTurnId;
    }

    public void setChatTurnId(String chatTurnId) {
        this.chatTurnId = chatTurnId;
    }

    public String getConversationId() {
        return this.conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getCwd() {
        return this.cwd;
    }

    public void setCwd(String cwd) {
        this.cwd = cwd;
    }

    public String getEndpoint() {
        return this.endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getInvocationType() {
        return this.invocationType;
    }

    public void setInvocationType(String invocationType) {
        this.invocationType = invocationType;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPermissionMode() {
        return this.permissionMode;
    }

    public void setPermissionMode(String permissionMode) {
        this.permissionMode = permissionMode;
    }

    public String getProvider() {
        return this.provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public Map<String, String> getRequestJson() {
        return this.requestJson;
    }

    public void setRequestJson(Map<String, String> requestJson) {
        this.requestJson = requestJson;
    }

    public String getRuntime() {
        return this.runtime;
    }

    public void setRuntime(String runtime) {
        this.runtime = runtime;
    }

    public String getSandboxPolicy() {
        return this.sandboxPolicy;
    }

    public void setSandboxPolicy(String sandboxPolicy) {
        this.sandboxPolicy = sandboxPolicy;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getStreaming() {
        return this.streaming;
    }

    public void setStreaming(Boolean streaming) {
        this.streaming = streaming;
    }

    public String getToolCallId() {
        return this.toolCallId;
    }

    public void setToolCallId(String toolCallId) {
        this.toolCallId = toolCallId;
    }

    public String getToolName() {
        return this.toolName;
    }

    public void setToolName(String toolName) {
        this.toolName = toolName;
    }

    public String getTraceId() {
        return this.traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }
}
