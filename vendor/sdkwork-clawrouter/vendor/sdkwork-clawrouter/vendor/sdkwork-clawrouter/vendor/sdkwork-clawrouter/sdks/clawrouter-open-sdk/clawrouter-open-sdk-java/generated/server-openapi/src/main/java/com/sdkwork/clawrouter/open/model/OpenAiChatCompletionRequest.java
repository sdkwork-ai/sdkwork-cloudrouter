package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiChatCompletionRequest {
    private OpenAiChatAudioConfig audio;
    private Double frequencyPenalty;
    private OpenAiFunctionCallChoice functionCall;
    private List<OpenAiFunctionDefinition> functions;
    private Map<String, Double> logitBias;
    private Boolean logprobs;
    private Integer maxCompletionTokens;
    private Integer maxTokens;
    private List<OpenAiChatMessage> messages;
    private Map<String, String> metadata;
    private List<String> modalities;
    private String model;
    private Integer n;
    private Boolean parallelToolCalls;
    private OpenAiPredictionConfig prediction;
    private Double presencePenalty;
    private String reasoningEffort;
    private OpenAiResponseFormat responseFormat;
    private Integer seed;
    private String serviceTier;
    private String stop;
    private Boolean store;
    private Boolean stream;
    private OpenAiStreamOptions streamOptions;
    private Double temperature;
    private OpenAiToolChoice toolChoice;
    private List<OpenAiTool> tools;
    private Integer topLogprobs;
    private Double topP;
    private String user;

    public OpenAiChatAudioConfig getAudio() {
        return this.audio;
    }

    public void setAudio(OpenAiChatAudioConfig audio) {
        this.audio = audio;
    }

    public Double getFrequencyPenalty() {
        return this.frequencyPenalty;
    }

    public void setFrequencyPenalty(Double frequencyPenalty) {
        this.frequencyPenalty = frequencyPenalty;
    }

    public OpenAiFunctionCallChoice getFunctionCall() {
        return this.functionCall;
    }

    public void setFunctionCall(OpenAiFunctionCallChoice functionCall) {
        this.functionCall = functionCall;
    }

    public List<OpenAiFunctionDefinition> getFunctions() {
        return this.functions;
    }

    public void setFunctions(List<OpenAiFunctionDefinition> functions) {
        this.functions = functions;
    }

    public Map<String, Double> getLogitBias() {
        return this.logitBias;
    }

    public void setLogitBias(Map<String, Double> logitBias) {
        this.logitBias = logitBias;
    }

    public Boolean getLogprobs() {
        return this.logprobs;
    }

    public void setLogprobs(Boolean logprobs) {
        this.logprobs = logprobs;
    }

    public Integer getMaxCompletionTokens() {
        return this.maxCompletionTokens;
    }

    public void setMaxCompletionTokens(Integer maxCompletionTokens) {
        this.maxCompletionTokens = maxCompletionTokens;
    }

    public Integer getMaxTokens() {
        return this.maxTokens;
    }

    public void setMaxTokens(Integer maxTokens) {
        this.maxTokens = maxTokens;
    }

    public List<OpenAiChatMessage> getMessages() {
        return this.messages;
    }

    public void setMessages(List<OpenAiChatMessage> messages) {
        this.messages = messages;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public List<String> getModalities() {
        return this.modalities;
    }

    public void setModalities(List<String> modalities) {
        this.modalities = modalities;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Integer getN() {
        return this.n;
    }

    public void setN(Integer n) {
        this.n = n;
    }

    public Boolean getParallelToolCalls() {
        return this.parallelToolCalls;
    }

    public void setParallelToolCalls(Boolean parallelToolCalls) {
        this.parallelToolCalls = parallelToolCalls;
    }

    public OpenAiPredictionConfig getPrediction() {
        return this.prediction;
    }

    public void setPrediction(OpenAiPredictionConfig prediction) {
        this.prediction = prediction;
    }

    public Double getPresencePenalty() {
        return this.presencePenalty;
    }

    public void setPresencePenalty(Double presencePenalty) {
        this.presencePenalty = presencePenalty;
    }

    public String getReasoningEffort() {
        return this.reasoningEffort;
    }

    public void setReasoningEffort(String reasoningEffort) {
        this.reasoningEffort = reasoningEffort;
    }

    public OpenAiResponseFormat getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(OpenAiResponseFormat responseFormat) {
        this.responseFormat = responseFormat;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public String getServiceTier() {
        return this.serviceTier;
    }

    public void setServiceTier(String serviceTier) {
        this.serviceTier = serviceTier;
    }

    public String getStop() {
        return this.stop;
    }

    public void setStop(String stop) {
        this.stop = stop;
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

    public OpenAiStreamOptions getStreamOptions() {
        return this.streamOptions;
    }

    public void setStreamOptions(OpenAiStreamOptions streamOptions) {
        this.streamOptions = streamOptions;
    }

    public Double getTemperature() {
        return this.temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
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

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }
}
