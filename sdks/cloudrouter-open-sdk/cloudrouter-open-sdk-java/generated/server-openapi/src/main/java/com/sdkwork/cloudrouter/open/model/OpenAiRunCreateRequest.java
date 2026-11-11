package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiRunCreateRequest {
    private String additionalInstructions;
    private List<OpenAiThreadMessageCreateRequest> additionalMessages;
    private String assistantId;
    private String instructions;
    private Integer maxCompletionTokens;
    private Integer maxPromptTokens;
    private Map<String, String> metadata;
    private String model;
    private Boolean parallelToolCalls;
    private String reasoningEffort;
    private String responseFormat;
    private Boolean stream;
    private Double temperature;
    private String toolChoice;
    private List<String> tools;
    private Double topP;
    private String truncationStrategy;

    public String getAdditionalInstructions() {
        return this.additionalInstructions;
    }

    public void setAdditionalInstructions(String additionalInstructions) {
        this.additionalInstructions = additionalInstructions;
    }

    public List<OpenAiThreadMessageCreateRequest> getAdditionalMessages() {
        return this.additionalMessages;
    }

    public void setAdditionalMessages(List<OpenAiThreadMessageCreateRequest> additionalMessages) {
        this.additionalMessages = additionalMessages;
    }

    public String getAssistantId() {
        return this.assistantId;
    }

    public void setAssistantId(String assistantId) {
        this.assistantId = assistantId;
    }

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public Integer getMaxCompletionTokens() {
        return this.maxCompletionTokens;
    }

    public void setMaxCompletionTokens(Integer maxCompletionTokens) {
        this.maxCompletionTokens = maxCompletionTokens;
    }

    public Integer getMaxPromptTokens() {
        return this.maxPromptTokens;
    }

    public void setMaxPromptTokens(Integer maxPromptTokens) {
        this.maxPromptTokens = maxPromptTokens;
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

    public Boolean getParallelToolCalls() {
        return this.parallelToolCalls;
    }

    public void setParallelToolCalls(Boolean parallelToolCalls) {
        this.parallelToolCalls = parallelToolCalls;
    }

    public String getReasoningEffort() {
        return this.reasoningEffort;
    }

    public void setReasoningEffort(String reasoningEffort) {
        this.reasoningEffort = reasoningEffort;
    }

    public String getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(String responseFormat) {
        this.responseFormat = responseFormat;
    }

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }

    public Double getTemperature() {
        return this.temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public String getToolChoice() {
        return this.toolChoice;
    }

    public void setToolChoice(String toolChoice) {
        this.toolChoice = toolChoice;
    }

    public List<String> getTools() {
        return this.tools;
    }

    public void setTools(List<String> tools) {
        this.tools = tools;
    }

    public Double getTopP() {
        return this.topP;
    }

    public void setTopP(Double topP) {
        this.topP = topP;
    }

    public String getTruncationStrategy() {
        return this.truncationStrategy;
    }

    public void setTruncationStrategy(String truncationStrategy) {
        this.truncationStrategy = truncationStrategy;
    }
}
