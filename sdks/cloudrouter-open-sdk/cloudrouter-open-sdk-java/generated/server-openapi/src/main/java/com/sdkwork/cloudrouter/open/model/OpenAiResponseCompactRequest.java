package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class OpenAiResponseCompactRequest {
    private Map<String, String> image;
    private String input;
    private String instructions;
    private String model;
    private String previousResponseId;
    private String promptCacheKey;
    private Map<String, String> promptCacheOptions;
    private String promptCacheRetention;
    private String serviceTier;

    public Map<String, String> getImage() {
        return this.image;
    }

    public void setImage(Map<String, String> image) {
        this.image = image;
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

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPreviousResponseId() {
        return this.previousResponseId;
    }

    public void setPreviousResponseId(String previousResponseId) {
        this.previousResponseId = previousResponseId;
    }

    public String getPromptCacheKey() {
        return this.promptCacheKey;
    }

    public void setPromptCacheKey(String promptCacheKey) {
        this.promptCacheKey = promptCacheKey;
    }

    public Map<String, String> getPromptCacheOptions() {
        return this.promptCacheOptions;
    }

    public void setPromptCacheOptions(Map<String, String> promptCacheOptions) {
        this.promptCacheOptions = promptCacheOptions;
    }

    public String getPromptCacheRetention() {
        return this.promptCacheRetention;
    }

    public void setPromptCacheRetention(String promptCacheRetention) {
        this.promptCacheRetention = promptCacheRetention;
    }

    public String getServiceTier() {
        return this.serviceTier;
    }

    public void setServiceTier(String serviceTier) {
        this.serviceTier = serviceTier;
    }
}
