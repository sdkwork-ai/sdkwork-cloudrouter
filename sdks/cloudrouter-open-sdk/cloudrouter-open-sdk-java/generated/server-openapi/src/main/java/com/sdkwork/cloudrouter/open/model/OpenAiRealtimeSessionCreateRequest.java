package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiRealtimeSessionCreateRequest {
    private Map<String, String> clientSecret;
    private String inputAudioFormat;
    private Map<String, String> inputAudioTranscription;
    private String instructions;
    private Integer maxResponseOutputTokens;
    private List<String> modalities;
    private String outputAudioFormat;
    private Map<String, String> prompt;
    private Double speed;
    private Double temperature;
    private String toolChoice;
    private List<Map<String, String>> tools;
    private Map<String, String> tracing;
    private Map<String, String> truncation;
    private Map<String, String> turnDetection;
    private String voice;

    public Map<String, String> getClientSecret() {
        return this.clientSecret;
    }

    public void setClientSecret(Map<String, String> clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getInputAudioFormat() {
        return this.inputAudioFormat;
    }

    public void setInputAudioFormat(String inputAudioFormat) {
        this.inputAudioFormat = inputAudioFormat;
    }

    public Map<String, String> getInputAudioTranscription() {
        return this.inputAudioTranscription;
    }

    public void setInputAudioTranscription(Map<String, String> inputAudioTranscription) {
        this.inputAudioTranscription = inputAudioTranscription;
    }

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public Integer getMaxResponseOutputTokens() {
        return this.maxResponseOutputTokens;
    }

    public void setMaxResponseOutputTokens(Integer maxResponseOutputTokens) {
        this.maxResponseOutputTokens = maxResponseOutputTokens;
    }

    public List<String> getModalities() {
        return this.modalities;
    }

    public void setModalities(List<String> modalities) {
        this.modalities = modalities;
    }

    public String getOutputAudioFormat() {
        return this.outputAudioFormat;
    }

    public void setOutputAudioFormat(String outputAudioFormat) {
        this.outputAudioFormat = outputAudioFormat;
    }

    public Map<String, String> getPrompt() {
        return this.prompt;
    }

    public void setPrompt(Map<String, String> prompt) {
        this.prompt = prompt;
    }

    public Double getSpeed() {
        return this.speed;
    }

    public void setSpeed(Double speed) {
        this.speed = speed;
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

    public Map<String, String> getTurnDetection() {
        return this.turnDetection;
    }

    public void setTurnDetection(Map<String, String> turnDetection) {
        this.turnDetection = turnDetection;
    }

    public String getVoice() {
        return this.voice;
    }

    public void setVoice(String voice) {
        this.voice = voice;
    }
}
