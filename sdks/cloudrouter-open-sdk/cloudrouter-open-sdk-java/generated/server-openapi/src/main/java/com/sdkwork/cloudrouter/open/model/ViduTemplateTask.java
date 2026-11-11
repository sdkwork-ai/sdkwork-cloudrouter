package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class ViduTemplateTask {
    private String aspectRatio;
    private Boolean bgm;
    private String createdAt;
    private List<ViduCreation> creations;
    private Integer credits;
    private Integer duration;
    private String errCode;
    private List<String> images;
    private String model;
    private Boolean offPeak;
    private String payload;
    private String prompt;
    private String resolution;
    private Integer seed;
    private String state;
    private String taskId;
    private String template;
    private Boolean watermark;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Boolean getBgm() {
        return this.bgm;
    }

    public void setBgm(Boolean bgm) {
        this.bgm = bgm;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public List<ViduCreation> getCreations() {
        return this.creations;
    }

    public void setCreations(List<ViduCreation> creations) {
        this.creations = creations;
    }

    public Integer getCredits() {
        return this.credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public String getErrCode() {
        return this.errCode;
    }

    public void setErrCode(String errCode) {
        this.errCode = errCode;
    }

    public List<String> getImages() {
        return this.images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Boolean getOffPeak() {
        return this.offPeak;
    }

    public void setOffPeak(Boolean offPeak) {
        this.offPeak = offPeak;
    }

    public String getPayload() {
        return this.payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
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

    public String getState() {
        return this.state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTemplate() {
        return this.template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public Boolean getWatermark() {
        return this.watermark;
    }

    public void setWatermark(Boolean watermark) {
        this.watermark = watermark;
    }
}
