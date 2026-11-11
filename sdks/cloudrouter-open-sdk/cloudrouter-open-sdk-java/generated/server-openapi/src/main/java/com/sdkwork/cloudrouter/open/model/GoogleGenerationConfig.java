package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class GoogleGenerationConfig {
    private Map<String, String> audioTranscriptionConfig;
    private Integer candidateCount;
    private Boolean enableAffectiveDialog;
    private Boolean enableEnhancedCivicAnswers;
    private Double frequencyPenalty;
    private Map<String, String> imageConfig;
    private Integer logprobs;
    private Integer maxOutputTokens;
    private String mediaResolution;
    private Double presencePenalty;
    private Map<String, String> responseFormat;
    private String responseJsonSchema;
    private Boolean responseLogprobs;
    private String responseMimeType;
    private List<String> responseModalities;
    private GoogleSchema responseSchema;
    private Integer seed;
    private Map<String, String> speechConfig;
    private List<String> stopSequences;
    private Double temperature;
    private GoogleThinkingConfig thinkingConfig;
    private Integer topK;
    private Double topP;
    private Map<String, String> translationConfig;

    public Map<String, String> getAudioTranscriptionConfig() {
        return this.audioTranscriptionConfig;
    }

    public void setAudioTranscriptionConfig(Map<String, String> audioTranscriptionConfig) {
        this.audioTranscriptionConfig = audioTranscriptionConfig;
    }

    public Integer getCandidateCount() {
        return this.candidateCount;
    }

    public void setCandidateCount(Integer candidateCount) {
        this.candidateCount = candidateCount;
    }

    public Boolean getEnableAffectiveDialog() {
        return this.enableAffectiveDialog;
    }

    public void setEnableAffectiveDialog(Boolean enableAffectiveDialog) {
        this.enableAffectiveDialog = enableAffectiveDialog;
    }

    public Boolean getEnableEnhancedCivicAnswers() {
        return this.enableEnhancedCivicAnswers;
    }

    public void setEnableEnhancedCivicAnswers(Boolean enableEnhancedCivicAnswers) {
        this.enableEnhancedCivicAnswers = enableEnhancedCivicAnswers;
    }

    public Double getFrequencyPenalty() {
        return this.frequencyPenalty;
    }

    public void setFrequencyPenalty(Double frequencyPenalty) {
        this.frequencyPenalty = frequencyPenalty;
    }

    public Map<String, String> getImageConfig() {
        return this.imageConfig;
    }

    public void setImageConfig(Map<String, String> imageConfig) {
        this.imageConfig = imageConfig;
    }

    public Integer getLogprobs() {
        return this.logprobs;
    }

    public void setLogprobs(Integer logprobs) {
        this.logprobs = logprobs;
    }

    public Integer getMaxOutputTokens() {
        return this.maxOutputTokens;
    }

    public void setMaxOutputTokens(Integer maxOutputTokens) {
        this.maxOutputTokens = maxOutputTokens;
    }

    public String getMediaResolution() {
        return this.mediaResolution;
    }

    public void setMediaResolution(String mediaResolution) {
        this.mediaResolution = mediaResolution;
    }

    public Double getPresencePenalty() {
        return this.presencePenalty;
    }

    public void setPresencePenalty(Double presencePenalty) {
        this.presencePenalty = presencePenalty;
    }

    public Map<String, String> getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(Map<String, String> responseFormat) {
        this.responseFormat = responseFormat;
    }

    public String getResponseJsonSchema() {
        return this.responseJsonSchema;
    }

    public void setResponseJsonSchema(String responseJsonSchema) {
        this.responseJsonSchema = responseJsonSchema;
    }

    public Boolean getResponseLogprobs() {
        return this.responseLogprobs;
    }

    public void setResponseLogprobs(Boolean responseLogprobs) {
        this.responseLogprobs = responseLogprobs;
    }

    public String getResponseMimeType() {
        return this.responseMimeType;
    }

    public void setResponseMimeType(String responseMimeType) {
        this.responseMimeType = responseMimeType;
    }

    public List<String> getResponseModalities() {
        return this.responseModalities;
    }

    public void setResponseModalities(List<String> responseModalities) {
        this.responseModalities = responseModalities;
    }

    public GoogleSchema getResponseSchema() {
        return this.responseSchema;
    }

    public void setResponseSchema(GoogleSchema responseSchema) {
        this.responseSchema = responseSchema;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public Map<String, String> getSpeechConfig() {
        return this.speechConfig;
    }

    public void setSpeechConfig(Map<String, String> speechConfig) {
        this.speechConfig = speechConfig;
    }

    public List<String> getStopSequences() {
        return this.stopSequences;
    }

    public void setStopSequences(List<String> stopSequences) {
        this.stopSequences = stopSequences;
    }

    public Double getTemperature() {
        return this.temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public GoogleThinkingConfig getThinkingConfig() {
        return this.thinkingConfig;
    }

    public void setThinkingConfig(GoogleThinkingConfig thinkingConfig) {
        this.thinkingConfig = thinkingConfig;
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

    public Map<String, String> getTranslationConfig() {
        return this.translationConfig;
    }

    public void setTranslationConfig(Map<String, String> translationConfig) {
        this.translationConfig = translationConfig;
    }
}
