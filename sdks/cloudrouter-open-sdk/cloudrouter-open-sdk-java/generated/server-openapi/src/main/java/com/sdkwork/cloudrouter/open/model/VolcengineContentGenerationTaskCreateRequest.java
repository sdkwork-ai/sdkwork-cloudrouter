package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class VolcengineContentGenerationTaskCreateRequest {
    private String callbackUrl;
    private Boolean cameraFixed;
    private List<VolcengineContentPart> content;
    private Boolean draft;
    private Integer duration;
    private Integer executionExpiresAfter;
    private Integer frames;
    private Boolean generateAudio;
    private String model;
    private String omniReferenceTaskType;
    private String outputFormat;
    private Integer priority;
    private String ratio;
    private String resolution;
    private Boolean returnLastFrame;
    private String safetyIdentifier;
    private Integer seed;
    private String serviceTier;
    private List<ArkWebSearchTool> tools;
    private Boolean watermark;

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public Boolean getCameraFixed() {
        return this.cameraFixed;
    }

    public void setCameraFixed(Boolean cameraFixed) {
        this.cameraFixed = cameraFixed;
    }

    public List<VolcengineContentPart> getContent() {
        return this.content;
    }

    public void setContent(List<VolcengineContentPart> content) {
        this.content = content;
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

    public Integer getExecutionExpiresAfter() {
        return this.executionExpiresAfter;
    }

    public void setExecutionExpiresAfter(Integer executionExpiresAfter) {
        this.executionExpiresAfter = executionExpiresAfter;
    }

    public Integer getFrames() {
        return this.frames;
    }

    public void setFrames(Integer frames) {
        this.frames = frames;
    }

    public Boolean getGenerateAudio() {
        return this.generateAudio;
    }

    public void setGenerateAudio(Boolean generateAudio) {
        this.generateAudio = generateAudio;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getOmniReferenceTaskType() {
        return this.omniReferenceTaskType;
    }

    public void setOmniReferenceTaskType(String omniReferenceTaskType) {
        this.omniReferenceTaskType = omniReferenceTaskType;
    }

    public String getOutputFormat() {
        return this.outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getRatio() {
        return this.ratio;
    }

    public void setRatio(String ratio) {
        this.ratio = ratio;
    }

    public String getResolution() {
        return this.resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public Boolean getReturnLastFrame() {
        return this.returnLastFrame;
    }

    public void setReturnLastFrame(Boolean returnLastFrame) {
        this.returnLastFrame = returnLastFrame;
    }

    public String getSafetyIdentifier() {
        return this.safetyIdentifier;
    }

    public void setSafetyIdentifier(String safetyIdentifier) {
        this.safetyIdentifier = safetyIdentifier;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public String getServiceTier() {
        return this.serviceTier;
    }

    public void setServiceTier(String serviceTier) {
        this.serviceTier = serviceTier;
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
