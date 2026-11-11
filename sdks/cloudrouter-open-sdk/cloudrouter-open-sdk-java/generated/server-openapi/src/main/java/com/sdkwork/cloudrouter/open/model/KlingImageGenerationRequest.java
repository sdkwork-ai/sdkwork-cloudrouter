package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class KlingImageGenerationRequest {
    private String aspectRatio;
    private String callbackUrl;
    private List<KlingElementReference> elementList;
    private String externalTaskId;
    private Double humanFidelity;
    private String image;
    private Double imageFidelity;
    private String imageReference;
    private String modelName;
    private Integer n;
    private String negativePrompt;
    private String prompt;
    private String resolution;
    private KlingWatermarkInfo watermarkInfo;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public List<KlingElementReference> getElementList() {
        return this.elementList;
    }

    public void setElementList(List<KlingElementReference> elementList) {
        this.elementList = elementList;
    }

    public String getExternalTaskId() {
        return this.externalTaskId;
    }

    public void setExternalTaskId(String externalTaskId) {
        this.externalTaskId = externalTaskId;
    }

    public Double getHumanFidelity() {
        return this.humanFidelity;
    }

    public void setHumanFidelity(Double humanFidelity) {
        this.humanFidelity = humanFidelity;
    }

    public String getImage() {
        return this.image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public Double getImageFidelity() {
        return this.imageFidelity;
    }

    public void setImageFidelity(Double imageFidelity) {
        this.imageFidelity = imageFidelity;
    }

    public String getImageReference() {
        return this.imageReference;
    }

    public void setImageReference(String imageReference) {
        this.imageReference = imageReference;
    }

    public String getModelName() {
        return this.modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public Integer getN() {
        return this.n;
    }

    public void setN(Integer n) {
        this.n = n;
    }

    public String getNegativePrompt() {
        return this.negativePrompt;
    }

    public void setNegativePrompt(String negativePrompt) {
        this.negativePrompt = negativePrompt;
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

    public KlingWatermarkInfo getWatermarkInfo() {
        return this.watermarkInfo;
    }

    public void setWatermarkInfo(KlingWatermarkInfo watermarkInfo) {
        this.watermarkInfo = watermarkInfo;
    }
}
