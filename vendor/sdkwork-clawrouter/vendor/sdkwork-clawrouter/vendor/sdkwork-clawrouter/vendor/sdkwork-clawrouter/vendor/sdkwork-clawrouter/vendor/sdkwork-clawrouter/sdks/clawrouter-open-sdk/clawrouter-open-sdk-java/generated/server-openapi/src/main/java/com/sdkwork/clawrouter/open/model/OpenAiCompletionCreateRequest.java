package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiCompletionCreateRequest {
    private Integer bestOf;
    private Boolean echo;
    private Double frequencyPenalty;
    private Map<String, Double> logitBias;
    private Integer logprobs;
    private Integer maxTokens;
    private String model;
    private Integer n;
    private Double presencePenalty;
    private String prompt;
    private Integer seed;
    private String stop;
    private Boolean stream;
    private String suffix;
    private Double temperature;
    private Double topP;
    private String user;

    public Integer getBestOf() {
        return this.bestOf;
    }

    public void setBestOf(Integer bestOf) {
        this.bestOf = bestOf;
    }

    public Boolean getEcho() {
        return this.echo;
    }

    public void setEcho(Boolean echo) {
        this.echo = echo;
    }

    public Double getFrequencyPenalty() {
        return this.frequencyPenalty;
    }

    public void setFrequencyPenalty(Double frequencyPenalty) {
        this.frequencyPenalty = frequencyPenalty;
    }

    public Map<String, Double> getLogitBias() {
        return this.logitBias;
    }

    public void setLogitBias(Map<String, Double> logitBias) {
        this.logitBias = logitBias;
    }

    public Integer getLogprobs() {
        return this.logprobs;
    }

    public void setLogprobs(Integer logprobs) {
        this.logprobs = logprobs;
    }

    public Integer getMaxTokens() {
        return this.maxTokens;
    }

    public void setMaxTokens(Integer maxTokens) {
        this.maxTokens = maxTokens;
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

    public Double getPresencePenalty() {
        return this.presencePenalty;
    }

    public void setPresencePenalty(Double presencePenalty) {
        this.presencePenalty = presencePenalty;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public String getStop() {
        return this.stop;
    }

    public void setStop(String stop) {
        this.stop = stop;
    }

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }

    public String getSuffix() {
        return this.suffix;
    }

    public void setSuffix(String suffix) {
        this.suffix = suffix;
    }

    public Double getTemperature() {
        return this.temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
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
