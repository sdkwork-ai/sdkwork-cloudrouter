package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class GoogleGenerateContentRequest {
    private String cachedContent;
    private List<GoogleContent> contents;
    private String continuationToken;
    private GoogleGenerationConfig generationConfig;
    private Map<String, String> labels;
    private String model;
    private List<GoogleSafetySetting> safetySettings;
    private String serviceTier;
    private Boolean store;
    private GoogleContent systemInstruction;
    private GoogleToolConfig toolConfig;
    private List<GoogleTool> tools;

    public String getCachedContent() {
        return this.cachedContent;
    }

    public void setCachedContent(String cachedContent) {
        this.cachedContent = cachedContent;
    }

    public List<GoogleContent> getContents() {
        return this.contents;
    }

    public void setContents(List<GoogleContent> contents) {
        this.contents = contents;
    }

    public String getContinuationToken() {
        return this.continuationToken;
    }

    public void setContinuationToken(String continuationToken) {
        this.continuationToken = continuationToken;
    }

    public GoogleGenerationConfig getGenerationConfig() {
        return this.generationConfig;
    }

    public void setGenerationConfig(GoogleGenerationConfig generationConfig) {
        this.generationConfig = generationConfig;
    }

    public Map<String, String> getLabels() {
        return this.labels;
    }

    public void setLabels(Map<String, String> labels) {
        this.labels = labels;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public List<GoogleSafetySetting> getSafetySettings() {
        return this.safetySettings;
    }

    public void setSafetySettings(List<GoogleSafetySetting> safetySettings) {
        this.safetySettings = safetySettings;
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

    public GoogleContent getSystemInstruction() {
        return this.systemInstruction;
    }

    public void setSystemInstruction(GoogleContent systemInstruction) {
        this.systemInstruction = systemInstruction;
    }

    public GoogleToolConfig getToolConfig() {
        return this.toolConfig;
    }

    public void setToolConfig(GoogleToolConfig toolConfig) {
        this.toolConfig = toolConfig;
    }

    public List<GoogleTool> getTools() {
        return this.tools;
    }

    public void setTools(List<GoogleTool> tools) {
        this.tools = tools;
    }
}
