package com.sdkwork.cloudrouter.open.model;


public class MinimaxVideoGenerationRequest {
    private String callbackUrl;
    private Integer duration;
    private Boolean fastPretreatment;
    private String firstFrameImage;
    private String lastFrameImage;
    private String model;
    private String prompt;
    private Boolean promptOptimizer;
    private String resolution;

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public Boolean getFastPretreatment() {
        return this.fastPretreatment;
    }

    public void setFastPretreatment(Boolean fastPretreatment) {
        this.fastPretreatment = fastPretreatment;
    }

    public String getFirstFrameImage() {
        return this.firstFrameImage;
    }

    public void setFirstFrameImage(String firstFrameImage) {
        this.firstFrameImage = firstFrameImage;
    }

    public String getLastFrameImage() {
        return this.lastFrameImage;
    }

    public void setLastFrameImage(String lastFrameImage) {
        this.lastFrameImage = lastFrameImage;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public Boolean getPromptOptimizer() {
        return this.promptOptimizer;
    }

    public void setPromptOptimizer(Boolean promptOptimizer) {
        this.promptOptimizer = promptOptimizer;
    }

    public String getResolution() {
        return this.resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }
}
