package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class ArkImageGenerationData {
    private String b64Json;
    private Map<String, String> boundingBox;
    private String description;
    private ProviderTaskError error;
    private String name;
    private String outputFormat;
    private String size;
    private String url;
    private Integer zIndex;

    public String getB64Json() {
        return this.b64Json;
    }

    public void setB64Json(String b64Json) {
        this.b64Json = b64Json;
    }

    public Map<String, String> getBoundingBox() {
        return this.boundingBox;
    }

    public void setBoundingBox(Map<String, String> boundingBox) {
        this.boundingBox = boundingBox;
    }

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ProviderTaskError getError() {
        return this.error;
    }

    public void setError(ProviderTaskError error) {
        this.error = error;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOutputFormat() {
        return this.outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public String getSize() {
        return this.size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Integer getZIndex() {
        return this.zIndex;
    }

    public void setZIndex(Integer zIndex) {
        this.zIndex = zIndex;
    }
}
