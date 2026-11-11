package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class RunwayTextToImageRequest {
    private String background;
    private String backgroundColor;
    private List<String> colors;
    private Map<String, String> contentModeration;
    private Boolean edit;
    private Boolean grounding;
    private String maskUri;
    private String model;
    private Integer outputCount;
    private String outputFormat;
    private Boolean preciseEdit;
    private String promptText;
    private String quality;
    private String ratio;
    private List<Map<String, String>> referenceImages;
    private Integer seed;
    private String thinkingLevel;

    public String getBackground() {
        return this.background;
    }

    public void setBackground(String background) {
        this.background = background;
    }

    public String getBackgroundColor() {
        return this.backgroundColor;
    }

    public void setBackgroundColor(String backgroundColor) {
        this.backgroundColor = backgroundColor;
    }

    public List<String> getColors() {
        return this.colors;
    }

    public void setColors(List<String> colors) {
        this.colors = colors;
    }

    public Map<String, String> getContentModeration() {
        return this.contentModeration;
    }

    public void setContentModeration(Map<String, String> contentModeration) {
        this.contentModeration = contentModeration;
    }

    public Boolean getEdit() {
        return this.edit;
    }

    public void setEdit(Boolean edit) {
        this.edit = edit;
    }

    public Boolean getGrounding() {
        return this.grounding;
    }

    public void setGrounding(Boolean grounding) {
        this.grounding = grounding;
    }

    public String getMaskUri() {
        return this.maskUri;
    }

    public void setMaskUri(String maskUri) {
        this.maskUri = maskUri;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Integer getOutputCount() {
        return this.outputCount;
    }

    public void setOutputCount(Integer outputCount) {
        this.outputCount = outputCount;
    }

    public String getOutputFormat() {
        return this.outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public Boolean getPreciseEdit() {
        return this.preciseEdit;
    }

    public void setPreciseEdit(Boolean preciseEdit) {
        this.preciseEdit = preciseEdit;
    }

    public String getPromptText() {
        return this.promptText;
    }

    public void setPromptText(String promptText) {
        this.promptText = promptText;
    }

    public String getQuality() {
        return this.quality;
    }

    public void setQuality(String quality) {
        this.quality = quality;
    }

    public String getRatio() {
        return this.ratio;
    }

    public void setRatio(String ratio) {
        this.ratio = ratio;
    }

    public List<Map<String, String>> getReferenceImages() {
        return this.referenceImages;
    }

    public void setReferenceImages(List<Map<String, String>> referenceImages) {
        this.referenceImages = referenceImages;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public String getThinkingLevel() {
        return this.thinkingLevel;
    }

    public void setThinkingLevel(String thinkingLevel) {
        this.thinkingLevel = thinkingLevel;
    }
}
