package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class AnthropicMessageCreateRequest {
    private AnthropicCacheControl cacheControl;
    private AnthropicContainer container;
    private AnthropicDiagnostics diagnostics;
    private String inferenceGeo;
    private Integer maxTokens;
    private List<AnthropicMessageParam> messages;
    private AnthropicMetadata metadata;
    private String model;
    private AnthropicOutputConfig outputConfig;
    private String serviceTier;
    private String speed;
    private List<String> stopSequences;
    private Boolean stream;
    private String system;
    private Double temperature;
    private AnthropicThinkingConfig thinking;
    private AnthropicToolChoice toolChoice;
    private List<AnthropicTool> tools;
    private Integer topK;
    private Double topP;

    public AnthropicCacheControl getCacheControl() {
        return this.cacheControl;
    }

    public void setCacheControl(AnthropicCacheControl cacheControl) {
        this.cacheControl = cacheControl;
    }

    public AnthropicContainer getContainer() {
        return this.container;
    }

    public void setContainer(AnthropicContainer container) {
        this.container = container;
    }

    public AnthropicDiagnostics getDiagnostics() {
        return this.diagnostics;
    }

    public void setDiagnostics(AnthropicDiagnostics diagnostics) {
        this.diagnostics = diagnostics;
    }

    public String getInferenceGeo() {
        return this.inferenceGeo;
    }

    public void setInferenceGeo(String inferenceGeo) {
        this.inferenceGeo = inferenceGeo;
    }

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

    public AnthropicMetadata getMetadata() {
        return this.metadata;
    }

    public void setMetadata(AnthropicMetadata metadata) {
        this.metadata = metadata;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public AnthropicOutputConfig getOutputConfig() {
        return this.outputConfig;
    }

    public void setOutputConfig(AnthropicOutputConfig outputConfig) {
        this.outputConfig = outputConfig;
    }

    public String getServiceTier() {
        return this.serviceTier;
    }

    public void setServiceTier(String serviceTier) {
        this.serviceTier = serviceTier;
    }

    public String getSpeed() {
        return this.speed;
    }

    public void setSpeed(String speed) {
        this.speed = speed;
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
