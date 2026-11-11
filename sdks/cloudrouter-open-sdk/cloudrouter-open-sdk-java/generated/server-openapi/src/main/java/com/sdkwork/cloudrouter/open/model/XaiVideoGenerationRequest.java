package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class XaiVideoGenerationRequest {
    private String aspectRatio;
    private Integer duration;
    private XaiImageUrl image;
    private List<XaiImageUrl> keyframes;
    private String model;
    private Map<String, String> output;
    private String prompt;
    private List<String> referenceAudios;
    private List<XaiImageUrl> referenceImages;
    private String resolution;
    private Map<String, String> storageOptions;
    private String user;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public XaiImageUrl getImage() {
        return this.image;
    }

    public void setImage(XaiImageUrl image) {
        this.image = image;
    }

    public List<XaiImageUrl> getKeyframes() {
        return this.keyframes;
    }

    public void setKeyframes(List<XaiImageUrl> keyframes) {
        this.keyframes = keyframes;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
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

    public List<String> getReferenceAudios() {
        return this.referenceAudios;
    }

    public void setReferenceAudios(List<String> referenceAudios) {
        this.referenceAudios = referenceAudios;
    }

    public List<XaiImageUrl> getReferenceImages() {
        return this.referenceImages;
    }

    public void setReferenceImages(List<XaiImageUrl> referenceImages) {
        this.referenceImages = referenceImages;
    }

    public String getResolution() {
        return this.resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
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
