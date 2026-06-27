package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiChatMessage {
    private String content;
    private OpenAiFunctionCall functionCall;
    private String name;
    private String refusal;
    private String role;
    private String toolCallId;
    private List<OpenAiToolCall> toolCalls;

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public OpenAiFunctionCall getFunctionCall() {
        return this.functionCall;
    }

    public void setFunctionCall(OpenAiFunctionCall functionCall) {
        this.functionCall = functionCall;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRefusal() {
        return this.refusal;
    }

    public void setRefusal(String refusal) {
        this.refusal = refusal;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getToolCallId() {
        return this.toolCallId;
    }

    public void setToolCallId(String toolCallId) {
        this.toolCallId = toolCallId;
    }

    public List<OpenAiToolCall> getToolCalls() {
        return this.toolCalls;
    }

    public void setToolCalls(List<OpenAiToolCall> toolCalls) {
        this.toolCalls = toolCalls;
    }
}
