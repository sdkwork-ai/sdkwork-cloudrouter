package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class ViduTemplateRequest {
    private String area;
    private String aspectRatio;
    private String beast;
    private Boolean bgm;
    private String callbackUrl;
    private List<String> images;
    private String metaData;
    private Boolean offPeak;
    private String payload;
    private String prompt;
    private Integer seed;
    private String template;
    private List<String> videoUrls;
    private Boolean watermark;
    private Integer wmPosition;
    private String wmUrl;

    public String getArea() {
        return this.area;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public String getBeast() {
        return this.beast;
    }

    public void setBeast(String beast) {
        this.beast = beast;
    }

    public Boolean getBgm() {
        return this.bgm;
    }

    public void setBgm(Boolean bgm) {
        this.bgm = bgm;
    }

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public List<String> getImages() {
        return this.images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public String getMetaData() {
        return this.metaData;
    }

    public void setMetaData(String metaData) {
        this.metaData = metaData;
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

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public String getTemplate() {
        return this.template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public List<String> getVideoUrls() {
        return this.videoUrls;
    }

    public void setVideoUrls(List<String> videoUrls) {
        this.videoUrls = videoUrls;
    }

    public Boolean getWatermark() {
        return this.watermark;
    }

    public void setWatermark(Boolean watermark) {
        this.watermark = watermark;
    }

    public Integer getWmPosition() {
        return this.wmPosition;
    }

    public void setWmPosition(Integer wmPosition) {
        this.wmPosition = wmPosition;
    }

    public String getWmUrl() {
        return this.wmUrl;
    }

    public void setWmUrl(String wmUrl) {
        this.wmUrl = wmUrl;
    }
}
