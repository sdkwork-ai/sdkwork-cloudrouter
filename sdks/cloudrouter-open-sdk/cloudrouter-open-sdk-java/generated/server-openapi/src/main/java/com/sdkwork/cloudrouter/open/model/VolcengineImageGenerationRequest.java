package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class VolcengineImageGenerationRequest {
    private String background;
    private String image;
    private Boolean layerDecomposition;
    private String model;
    private Map<String, String> optimizePromptOptions;
    private String outputFormat;
    private String prompt;
    private String responseFormat;
    private String sequentialImageGeneration;
    private Map<String, String> sequentialImageGenerationOptions;
    private String size;
    private Boolean stream;
    private List<ArkWebSearchTool> tools;
    private Boolean watermark;

    public String getBackground() {
        return this.background;
    }

    public void setBackground(String background) {
        this.background = background;
    }

    public String getImage() {
        return this.image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public Boolean getLayerDecomposition() {
        return this.layerDecomposition;
    }

    public void setLayerDecomposition(Boolean layerDecomposition) {
        this.layerDecomposition = layerDecomposition;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Map<String, String> getOptimizePromptOptions() {
        return this.optimizePromptOptions;
    }

    public void setOptimizePromptOptions(Map<String, String> optimizePromptOptions) {
        this.optimizePromptOptions = optimizePromptOptions;
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

    public String getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(String responseFormat) {
        this.responseFormat = responseFormat;
    }

    public String getSequentialImageGeneration() {
        return this.sequentialImageGeneration;
    }

    public void setSequentialImageGeneration(String sequentialImageGeneration) {
        this.sequentialImageGeneration = sequentialImageGeneration;
    }

    public Map<String, String> getSequentialImageGenerationOptions() {
        return this.sequentialImageGenerationOptions;
    }

    public void setSequentialImageGenerationOptions(Map<String, String> sequentialImageGenerationOptions) {
        this.sequentialImageGenerationOptions = sequentialImageGenerationOptions;
    }

    public String getSize() {
        return this.size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }

    public List<ArkWebSearchTool> getTools() {
        return this.tools;
    }

    public void setTools(List<ArkWebSearchTool> tools) {
        this.tools = tools;
    }

    public Boolean getWatermark() {
        return this.watermark;
    }

    public void setWatermark(Boolean watermark) {
        this.watermark = watermark;
    }
}
