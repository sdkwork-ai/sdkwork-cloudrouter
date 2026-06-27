package com.sdkwork.clawrouter.open.model;


public class KlingVideoGenerationRequest {
    private String aspectRatio;
    private String callbackUrl;
    private Double cfgScale;
    private Integer duration;
    private String image;
    private String imageTail;
    private String mode;
    private String model;
    private String negativePrompt;
    private String prompt;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public Double getCfgScale() {
        return this.cfgScale;
    }

    public void setCfgScale(Double cfgScale) {
        this.cfgScale = cfgScale;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public String getImage() {
        return this.image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public String getImageTail() {
        return this.imageTail;
    }

    public void setImageTail(String imageTail) {
        this.imageTail = imageTail;
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

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }
}
