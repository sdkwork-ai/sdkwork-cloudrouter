package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class LumaVideoGenerationTask {
    private LumaGenerationAssets assets;
    private String createdAt;
    private String failureReason;
    private String generationType;
    private String id;
    private String model;
    private Map<String, String> request;
    private String state;

    public LumaGenerationAssets getAssets() {
        return this.assets;
    }

    public void setAssets(LumaGenerationAssets assets) {
        this.assets = assets;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getFailureReason() {
        return this.failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public String getGenerationType() {
        return this.generationType;
    }

    public void setGenerationType(String generationType) {
        this.generationType = generationType;
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

    public Map<String, String> getRequest() {
        return this.request;
    }

    public void setRequest(Map<String, String> request) {
        this.request = request;
    }

    public String getState() {
        return this.state;
    }

    public void setState(String state) {
        this.state = state;
    }
}
