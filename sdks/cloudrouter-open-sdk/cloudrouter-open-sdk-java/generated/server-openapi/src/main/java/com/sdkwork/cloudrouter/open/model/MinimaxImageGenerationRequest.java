package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class MinimaxImageGenerationRequest {
    private String aspectRatio;
    private Integer height;
    private String model;
    private Integer n;
    private String prompt;
    private Boolean promptOptimizer;
    private String responseFormat;
    private Integer seed;
    private List<Map<String, String>> subjectReference;
    private Integer width;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Integer getHeight() {
        return this.height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

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

    public Boolean getPromptOptimizer() {
        return this.promptOptimizer;
    }

    public void setPromptOptimizer(Boolean promptOptimizer) {
        this.promptOptimizer = promptOptimizer;
    }

    public String getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(String responseFormat) {
        this.responseFormat = responseFormat;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public List<Map<String, String>> getSubjectReference() {
        return this.subjectReference;
    }

    public void setSubjectReference(List<Map<String, String>> subjectReference) {
        this.subjectReference = subjectReference;
    }

    public Integer getWidth() {
        return this.width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }
}
