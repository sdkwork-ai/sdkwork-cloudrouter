package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleGenerateContentRequest {
    private String cachedContent;
    private List<GoogleContent> contents;
    private GoogleGenerationConfig generationConfig;
    private List<GoogleSafetySetting> safetySettings;
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

    public GoogleGenerationConfig getGenerationConfig() {
        return this.generationConfig;
    }

    public void setGenerationConfig(GoogleGenerationConfig generationConfig) {
        this.generationConfig = generationConfig;
    }

    public List<GoogleSafetySetting> getSafetySettings() {
        return this.safetySettings;
    }

    public void setSafetySettings(List<GoogleSafetySetting> safetySettings) {
        this.safetySettings = safetySettings;
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
