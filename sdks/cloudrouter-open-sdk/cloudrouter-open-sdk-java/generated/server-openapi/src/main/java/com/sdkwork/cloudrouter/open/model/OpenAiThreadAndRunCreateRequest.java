package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiThreadAndRunCreateRequest {
    private String assistantId;
    private String instructions;
    private Integer maxCompletionTokens;
    private Integer maxPromptTokens;
    private Map<String, String> metadata;
    private String model;
    private Boolean parallelToolCalls;
    private String responseFormat;
    private Boolean stream;
    private Double temperature;
    private OpenAiThreadCreateRequest thread;
    private String toolChoice;
    private String toolResources;
    private List<String> tools;
    private Double topP;
    private String truncationStrategy;

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

    public OpenAiThreadCreateRequest getThread() {
        return this.thread;
    }

    public void setThread(OpenAiThreadCreateRequest thread) {
        this.thread = thread;
    }

    public String getToolChoice() {
        return this.toolChoice;
    }

    public void setToolChoice(String toolChoice) {
        this.toolChoice = toolChoice;
    }

    public String getToolResources() {
        return this.toolResources;
    }

    public void setToolResources(String toolResources) {
        this.toolResources = toolResources;
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
