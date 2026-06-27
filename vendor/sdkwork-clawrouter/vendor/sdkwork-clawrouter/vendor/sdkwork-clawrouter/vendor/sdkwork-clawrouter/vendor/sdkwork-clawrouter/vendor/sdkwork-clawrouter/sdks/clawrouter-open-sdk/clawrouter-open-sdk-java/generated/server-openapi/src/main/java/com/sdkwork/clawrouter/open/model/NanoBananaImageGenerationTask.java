package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class NanoBananaImageGenerationTask {
    private String createdAt;
    private ProviderTaskError error;
    private String id;
    private List<ProviderGeneratedMedia> images;
    private String model;
    private String prompt;
    private String state;
    private String status;
    private String taskId;
    private String updatedAt;

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public ProviderTaskError getError() {
        return this.error;
    }

    public void setError(ProviderTaskError error) {
        this.error = error;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<ProviderGeneratedMedia> getImages() {
        return this.images;
    }

    public void setImages(List<ProviderGeneratedMedia> images) {
        this.images = images;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getState() {
        return this.state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
