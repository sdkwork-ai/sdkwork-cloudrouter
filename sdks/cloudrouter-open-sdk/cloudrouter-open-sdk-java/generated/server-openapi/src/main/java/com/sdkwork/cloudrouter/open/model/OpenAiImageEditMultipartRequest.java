package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class OpenAiImageEditMultipartRequest {
    private String background;
    private String complexity;
    private Integer frameCount;
    private Integer frameDurationMs;
    private byte[] image;
    private String inputFidelity;
    private String markup;
    private byte[] mask;
    private String model;
    private String moderation;
    private Integer n;
    private Integer outputCompression;
    private String outputFormat;
    private Integer partialImages;
    private String prompt;
    private String quality;
    private String responseFormat;
    private String safetyIdentifier;
    private String size;
    private Boolean stream;
    private Map<String, String> svg;
    private String user;

    public String getBackground() {
        return this.background;
    }

    public void setBackground(String background) {
        this.background = background;
    }

    public String getComplexity() {
        return this.complexity;
    }

    public void setComplexity(String complexity) {
        this.complexity = complexity;
    }

    public Integer getFrameCount() {
        return this.frameCount;
    }

    public void setFrameCount(Integer frameCount) {
        this.frameCount = frameCount;
    }

    public Integer getFrameDurationMs() {
        return this.frameDurationMs;
    }

    public void setFrameDurationMs(Integer frameDurationMs) {
        this.frameDurationMs = frameDurationMs;
    }

    public byte[] getImage() {
        return this.image;
    }

    public void setImage(byte[] image) {
        this.image = image;
    }

    public String getInputFidelity() {
        return this.inputFidelity;
    }

    public void setInputFidelity(String inputFidelity) {
        this.inputFidelity = inputFidelity;
    }

    public String getMarkup() {
        return this.markup;
    }

    public void setMarkup(String markup) {
        this.markup = markup;
    }

    public byte[] getMask() {
        return this.mask;
    }

    public void setMask(byte[] mask) {
        this.mask = mask;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getModeration() {
        return this.moderation;
    }

    public void setModeration(String moderation) {
        this.moderation = moderation;
    }

    public Integer getN() {
        return this.n;
    }

    public void setN(Integer n) {
        this.n = n;
    }

    public Integer getOutputCompression() {
        return this.outputCompression;
    }

    public void setOutputCompression(Integer outputCompression) {
        this.outputCompression = outputCompression;
    }

    public String getOutputFormat() {
        return this.outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public Integer getPartialImages() {
        return this.partialImages;
    }

    public void setPartialImages(Integer partialImages) {
        this.partialImages = partialImages;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getQuality() {
        return this.quality;
    }

    public void setQuality(String quality) {
        this.quality = quality;
    }

    public String getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(String responseFormat) {
        this.responseFormat = responseFormat;
    }

    public String getSafetyIdentifier() {
        return this.safetyIdentifier;
    }

    public void setSafetyIdentifier(String safetyIdentifier) {
        this.safetyIdentifier = safetyIdentifier;
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

    public Map<String, String> getSvg() {
        return this.svg;
    }

    public void setSvg(Map<String, String> svg) {
        this.svg = svg;
    }

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }
}
