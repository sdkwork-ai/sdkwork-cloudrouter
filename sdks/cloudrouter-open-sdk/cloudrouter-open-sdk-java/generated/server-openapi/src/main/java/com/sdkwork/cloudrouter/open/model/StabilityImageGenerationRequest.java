package com.sdkwork.cloudrouter.open.model;


public class StabilityImageGenerationRequest {
    private String aspectRatio;
    private Double cfgScale;
    private String image;
    private String mode;
    private String model;
    private String negativePrompt;
    private String outputFormat;
    private String prompt;
    private Integer seed;
    private Double strength;
    private String stylePreset;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Double getCfgScale() {
        return this.cfgScale;
    }

    public void setCfgScale(Double cfgScale) {
        this.cfgScale = cfgScale;
    }

    public String getImage() {
        return this.image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public String getMode() {
        return this.mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getNegativePrompt() {
        return this.negativePrompt;
    }

    public void setNegativePrompt(String negativePrompt) {
        this.negativePrompt = negativePrompt;
    }

    public String getOutputFormat() {
        return this.outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
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

    public Double getStrength() {
        return this.strength;
    }

    public void setStrength(Double strength) {
        this.strength = strength;
    }

    public String getStylePreset() {
        return this.stylePreset;
    }

    public void setStylePreset(String stylePreset) {
        this.stylePreset = stylePreset;
    }
}
