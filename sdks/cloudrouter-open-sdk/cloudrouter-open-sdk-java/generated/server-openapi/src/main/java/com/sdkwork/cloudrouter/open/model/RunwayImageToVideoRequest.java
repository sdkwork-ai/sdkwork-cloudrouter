package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class RunwayImageToVideoRequest {
    private Boolean audio;
    private String bitrate;
    private Double cfgScale;
    private Map<String, String> contentModeration;
    private Boolean draft;
    private Integer duration;
    private String model;
    private String negativePrompt;
    private String outputFormat;
    private String promptExpansionMode;
    private String promptImage;
    private String promptText;
    private String proresProfile;
    private Map<String, String> providerSettings;
    private String ratio;
    private List<Map<String, String>> referenceAudio;
    private List<Map<String, String>> referenceVideos;
    private List<Map<String, String>> references;
    private String resolution;
    private Integer seed;

    public Boolean getAudio() {
        return this.audio;
    }

    public void setAudio(Boolean audio) {
        this.audio = audio;
    }

    public String getBitrate() {
        return this.bitrate;
    }

    public void setBitrate(String bitrate) {
        this.bitrate = bitrate;
    }

    public Double getCfgScale() {
        return this.cfgScale;
    }

    public void setCfgScale(Double cfgScale) {
        this.cfgScale = cfgScale;
    }

    public Map<String, String> getContentModeration() {
        return this.contentModeration;
    }

    public void setContentModeration(Map<String, String> contentModeration) {
        this.contentModeration = contentModeration;
    }

    public Boolean getDraft() {
        return this.draft;
    }

    public void setDraft(Boolean draft) {
        this.draft = draft;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
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

    public String getPromptExpansionMode() {
        return this.promptExpansionMode;
    }

    public void setPromptExpansionMode(String promptExpansionMode) {
        this.promptExpansionMode = promptExpansionMode;
    }

    public String getPromptImage() {
        return this.promptImage;
    }

    public void setPromptImage(String promptImage) {
        this.promptImage = promptImage;
    }

    public String getPromptText() {
        return this.promptText;
    }

    public void setPromptText(String promptText) {
        this.promptText = promptText;
    }

    public String getProresProfile() {
        return this.proresProfile;
    }

    public void setProresProfile(String proresProfile) {
        this.proresProfile = proresProfile;
    }

    public Map<String, String> getProviderSettings() {
        return this.providerSettings;
    }

    public void setProviderSettings(Map<String, String> providerSettings) {
        this.providerSettings = providerSettings;
    }

    public String getRatio() {
        return this.ratio;
    }

    public void setRatio(String ratio) {
        this.ratio = ratio;
    }

    public List<Map<String, String>> getReferenceAudio() {
        return this.referenceAudio;
    }

    public void setReferenceAudio(List<Map<String, String>> referenceAudio) {
        this.referenceAudio = referenceAudio;
    }

    public List<Map<String, String>> getReferenceVideos() {
        return this.referenceVideos;
    }

    public void setReferenceVideos(List<Map<String, String>> referenceVideos) {
        this.referenceVideos = referenceVideos;
    }

    public List<Map<String, String>> getReferences() {
        return this.references;
    }

    public void setReferences(List<Map<String, String>> references) {
        this.references = references;
    }

    public String getResolution() {
        return this.resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }
}
