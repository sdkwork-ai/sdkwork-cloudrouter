package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class VolcengineContentGenerationTask {
    private ArkVideoTaskContent content;
    private Integer createdAt;
    private Boolean draft;
    private Integer duration;
    private ProviderTaskError error;
    private Integer executionExpiresAfter;
    private Integer frames;
    private Integer framespersecond;
    private Boolean generateAudio;
    private String id;
    private String model;
    private String outputFormat;
    private Integer priority;
    private String ratio;
    private String resolution;
    private String safetyIdentifier;
    private Integer seed;
    private String serviceTier;
    private String status;
    private List<ArkWebSearchTool> tools;
    private Integer updatedAt;
    private ArkVideoUsage usage;

    public ArkVideoTaskContent getContent() {
        return this.content;
    }

    public void setContent(ArkVideoTaskContent content) {
        this.content = content;
    }

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
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

    public ProviderTaskError getError() {
        return this.error;
    }

    public void setError(ProviderTaskError error) {
        this.error = error;
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

    public Integer getFramespersecond() {
        return this.framespersecond;
    }

    public void setFramespersecond(Integer framespersecond) {
        this.framespersecond = framespersecond;
    }

    public Boolean getGenerateAudio() {
        return this.generateAudio;
    }

    public void setGenerateAudio(Boolean generateAudio) {
        this.generateAudio = generateAudio;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
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

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<ArkWebSearchTool> getTools() {
        return this.tools;
    }

    public void setTools(List<ArkWebSearchTool> tools) {
        this.tools = tools;
    }

    public Integer getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(Integer updatedAt) {
        this.updatedAt = updatedAt;
    }

    public ArkVideoUsage getUsage() {
        return this.usage;
    }

    public void setUsage(ArkVideoUsage usage) {
        this.usage = usage;
    }
}
