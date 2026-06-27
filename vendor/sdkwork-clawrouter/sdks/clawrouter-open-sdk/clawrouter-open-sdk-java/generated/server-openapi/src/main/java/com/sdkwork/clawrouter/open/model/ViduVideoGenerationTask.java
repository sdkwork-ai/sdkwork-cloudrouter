package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class ViduVideoGenerationTask {
    private String createdAt;
    private List<ViduCreation> creations;
    private String model;
    private String state;
    private String taskId;

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

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
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
}
