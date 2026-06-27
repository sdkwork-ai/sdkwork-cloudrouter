package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class VolcengineContentGenerationTask {
    private List<VolcengineContentPart> content;
    private String createdAt;
    private ProviderTaskError error;
    private String id;
    private String model;
    private String prompt;
    private ProviderTaskResult result;
    private String state;
    private String status;
    private String taskId;
    private String updatedAt;
    private List<ProviderGeneratedMedia> videos;

    public List<VolcengineContentPart> getContent() {
        return this.content;
    }

    public void setContent(List<VolcengineContentPart> content) {
        this.content = content;
    }

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

    public ProviderTaskResult getResult() {
        return this.result;
    }

    public void setResult(ProviderTaskResult result) {
        this.result = result;
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

    public List<ProviderGeneratedMedia> getVideos() {
        return this.videos;
    }

    public void setVideos(List<ProviderGeneratedMedia> videos) {
        this.videos = videos;
    }
}
