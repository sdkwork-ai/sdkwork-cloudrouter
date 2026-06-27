package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiResponsesRequest {
    private Boolean background;
    private String conversation;
    private List<String> include;
    private String input;
    private String instructions;
    private Integer maxOutputTokens;
    private Integer maxToolCalls;
    private Map<String, String> metadata;
    private String model;
    private Boolean parallelToolCalls;
    private String previousResponseId;
    private OpenAiPromptReference prompt;
    private String promptCacheKey;
    private OpenAiReasoningConfig reasoning;
    private String serviceTier;
    private Boolean store;
    private Boolean stream;
    private Double temperature;
    private OpenAiTextConfig text;
    private OpenAiToolChoice toolChoice;
    private List<OpenAiTool> tools;
    private Integer topLogprobs;
    private Double topP;
    private String truncation;
    private String user;

    public Boolean getBackground() {
        return this.background;
    }

    public void setBackground(Boolean background) {
        this.background = background;
    }

    public String getConversation() {
        return this.conversation;
    }

    public void setConversation(String conversation) {
        this.conversation = conversation;
    }

    public List<String> getInclude() {
        return this.include;
    }

    public void setInclude(List<String> include) {
        this.include = include;
    }

    public String getInput() {
        return this.input;
    }

    public void setInput(String input) {
        this.input = input;
    }

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public Integer getMaxOutputTokens() {
        return this.maxOutputTokens;
    }

    public void setMaxOutputTokens(Integer maxOutputTokens) {
        this.maxOutputTokens = maxOutputTokens;
    }

    public Integer getMaxToolCalls() {
        return this.maxToolCalls;
    }

    public void setMaxToolCalls(Integer maxToolCalls) {
        this.maxToolCalls = maxToolCalls;
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

    public String getPreviousResponseId() {
        return this.previousResponseId;
    }

    public void setPreviousResponseId(String previousResponseId) {
        this.previousResponseId = previousResponseId;
    }

    public OpenAiPromptReference getPrompt() {
        return this.prompt;
    }

    public void setPrompt(OpenAiPromptReference prompt) {
        this.prompt = prompt;
    }

    public String getPromptCacheKey() {
        return this.promptCacheKey;
    }

    public void setPromptCacheKey(String promptCacheKey) {
        this.promptCacheKey = promptCacheKey;
    }

    public OpenAiReasoningConfig getReasoning() {
        return this.reasoning;
    }

    public void setReasoning(OpenAiReasoningConfig reasoning) {
        this.reasoning = reasoning;
    }

    public String getServiceTier() {
        return this.serviceTier;
    }

    public void setServiceTier(String serviceTier) {
        this.serviceTier = serviceTier;
    }

    public Boolean getStore() {
        return this.store;
    }

    public void setStore(Boolean store) {
        this.store = store;
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

    public OpenAiTextConfig getText() {
        return this.text;
    }

    public void setText(OpenAiTextConfig text) {
        this.text = text;
    }

    public OpenAiToolChoice getToolChoice() {
        return this.toolChoice;
    }

    public void setToolChoice(OpenAiToolChoice toolChoice) {
        this.toolChoice = toolChoice;
    }

    public List<OpenAiTool> getTools() {
        return this.tools;
    }

    public void setTools(List<OpenAiTool> tools) {
        this.tools = tools;
    }

    public Integer getTopLogprobs() {
        return this.topLogprobs;
    }

    public void setTopLogprobs(Integer topLogprobs) {
        this.topLogprobs = topLogprobs;
    }

    public Double getTopP() {
        return this.topP;
    }

    public void setTopP(Double topP) {
        this.topP = topP;
    }

    public String getTruncation() {
        return this.truncation;
    }

    public void setTruncation(String truncation) {
        this.truncation = truncation;
    }

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }
}
