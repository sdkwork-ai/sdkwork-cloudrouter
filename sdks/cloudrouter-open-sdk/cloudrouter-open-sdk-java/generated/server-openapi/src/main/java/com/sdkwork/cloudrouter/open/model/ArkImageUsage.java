package com.sdkwork.cloudrouter.open.model;


public class ArkImageUsage {
    private Integer generatedImages;
    private Integer inputImages;
    private Integer outputTokens;
    private ArkVideoToolUsage toolUsage;
    private Integer totalTokens;

    public Integer getGeneratedImages() {
        return this.generatedImages;
    }

    public void setGeneratedImages(Integer generatedImages) {
        this.generatedImages = generatedImages;
    }

    public Integer getInputImages() {
        return this.inputImages;
    }

    public void setInputImages(Integer inputImages) {
        this.inputImages = inputImages;
    }

    public Integer getOutputTokens() {
        return this.outputTokens;
    }

    public void setOutputTokens(Integer outputTokens) {
        this.outputTokens = outputTokens;
    }

    public ArkVideoToolUsage getToolUsage() {
        return this.toolUsage;
    }

    public void setToolUsage(ArkVideoToolUsage toolUsage) {
        this.toolUsage = toolUsage;
    }

    public Integer getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(Integer totalTokens) {
        this.totalTokens = totalTokens;
    }
}
