package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class AnthropicMessageCreateRequest {
    private Integer maxTokens;
    private List<AnthropicMessageParam> messages;
    private Map<String, String> metadata;
    private String model;
    private List<String> stopSequences;
    private Boolean stream;
    private String system;
    private Double temperature;
    private AnthropicThinkingConfig thinking;
    private AnthropicToolChoice toolChoice;
    private List<AnthropicTool> tools;
    private Integer topK;
    private Double topP;

    public Integer getMaxTokens() {
        return this.maxTokens;
    }

    public void setMaxTokens(Integer maxTokens) {
        this.maxTokens = maxTokens;
    }

    public List<AnthropicMessageParam> getMessages() {
        return this.messages;
    }

    public void setMessages(List<AnthropicMessageParam> messages) {
        this.messages = messages;
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

    public List<String> getStopSequences() {
        return this.stopSequences;
    }

    public void setStopSequences(List<String> stopSequences) {
        this.stopSequences = stopSequences;
    }

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }

    public String getSystem() {
        return this.system;
    }

    public void setSystem(String system) {
        this.system = system;
    }

    public Double getTemperature() {
        return this.temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public AnthropicThinkingConfig getThinking() {
        return this.thinking;
    }

    public void setThinking(AnthropicThinkingConfig thinking) {
        this.thinking = thinking;
    }

    public AnthropicToolChoice getToolChoice() {
        return this.toolChoice;
    }

    public void setToolChoice(AnthropicToolChoice toolChoice) {
        this.toolChoice = toolChoice;
    }

    public List<AnthropicTool> getTools() {
        return this.tools;
    }

    public void setTools(List<AnthropicTool> tools) {
        this.tools = tools;
    }

    public Integer getTopK() {
        return this.topK;
    }

    public void setTopK(Integer topK) {
        this.topK = topK;
    }

    public Double getTopP() {
        return this.topP;
    }

    public void setTopP(Double topP) {
        this.topP = topP;
    }
}
