package com.sdkwork.clawrouter.open.model;


public class OpenAiImageGenerationRequest {
    private String model;
    private Integer n;
    private String prompt;
    private String quality;
    private String responseFormat;
    private String size;

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Integer getN() {
        return this.n;
    }

    public void setN(Integer n) {
        this.n = n;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getQuality() {
        return this.quality;
    }

    public void setQuality(String quality) {
        this.quality = quality;
    }

    public String getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(String responseFormat) {
        this.responseFormat = responseFormat;
    }

    public String getSize() {
        return this.size;
    }

    public void setSize(String size) {
        this.size = size;
    }
}
