package com.sdkwork.cloudrouter.open.model;


public class AlibabaSpeechInput {
    private String instructions;
    private String languageType;
    private Boolean optimizeInstructions;
    private String text;
    private String voice;

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public String getLanguageType() {
        return this.languageType;
    }

    public void setLanguageType(String languageType) {
        this.languageType = languageType;
    }

    public Boolean getOptimizeInstructions() {
        return this.optimizeInstructions;
    }

    public void setOptimizeInstructions(Boolean optimizeInstructions) {
        this.optimizeInstructions = optimizeInstructions;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getVoice() {
        return this.voice;
    }

    public void setVoice(String voice) {
        this.voice = voice;
    }
}
