package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiRealtimeCallActionRequest {
    private Map<String, String> audio;
    private List<String> include;
    private String instructions;
    private Integer maxOutputTokens;
    private String model;
    private List<String> outputModalities;
    private Boolean parallelToolCalls;
    private Map<String, String> prompt;
    private Map<String, String> reasoning;
    private String toolChoice;
    private List<Map<String, String>> tools;
    private Map<String, String> tracing;
    private Map<String, String> truncation;
    private String type;

    public Map<String, String> getAudio() {
        return this.audio;
    }

    public void setAudio(Map<String, String> audio) {
        this.audio = audio;
    }

    public List<String> getInclude() {
        return this.include;
    }

    public void setInclude(List<String> include) {
        this.include = include;
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

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public List<String> getOutputModalities() {
        return this.outputModalities;
    }

    public void setOutputModalities(List<String> outputModalities) {
        this.outputModalities = outputModalities;
    }

    public Boolean getParallelToolCalls() {
        return this.parallelToolCalls;
    }

    public void setParallelToolCalls(Boolean parallelToolCalls) {
        this.parallelToolCalls = parallelToolCalls;
    }

    public Map<String, String> getPrompt() {
        return this.prompt;
    }

    public void setPrompt(Map<String, String> prompt) {
        this.prompt = prompt;
    }

    public Map<String, String> getReasoning() {
        return this.reasoning;
    }

    public void setReasoning(Map<String, String> reasoning) {
        this.reasoning = reasoning;
    }

    public String getToolChoice() {
        return this.toolChoice;
    }

    public void setToolChoice(String toolChoice) {
        this.toolChoice = toolChoice;
    }

    public List<Map<String, String>> getTools() {
        return this.tools;
    }

    public void setTools(List<Map<String, String>> tools) {
        this.tools = tools;
    }

    public Map<String, String> getTracing() {
        return this.tracing;
    }

    public void setTracing(Map<String, String> tracing) {
        this.tracing = tracing;
    }

    public Map<String, String> getTruncation() {
        return this.truncation;
    }

    public void setTruncation(Map<String, String> truncation) {
        this.truncation = truncation;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
