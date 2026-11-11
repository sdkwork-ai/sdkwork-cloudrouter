package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class XaiImageEditRequest {
    private String aspectRatio;
    private Boolean deferred;
    private XaiImageUrl image;
    private List<XaiImageUrl> images;
    private String model;
    private Integer n;
    private Map<String, String> output;
    private String prompt;
    private String resolution;
    private String responseFormat;
    private Map<String, String> storageOptions;
    private String user;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Boolean getDeferred() {
        return this.deferred;
    }

    public void setDeferred(Boolean deferred) {
        this.deferred = deferred;
    }

    public XaiImageUrl getImage() {
        return this.image;
    }

    public void setImage(XaiImageUrl image) {
        this.image = image;
    }

    public List<XaiImageUrl> getImages() {
        return this.images;
    }

    public void setImages(List<XaiImageUrl> images) {
        this.images = images;
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

    public Map<String, String> getOutput() {
        return this.output;
    }

    public void setOutput(Map<String, String> output) {
        this.output = output;
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

    public String getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(String responseFormat) {
        this.responseFormat = responseFormat;
    }

    public Map<String, String> getStorageOptions() {
        return this.storageOptions;
    }

    public void setStorageOptions(Map<String, String> storageOptions) {
        this.storageOptions = storageOptions;
    }

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }
}
