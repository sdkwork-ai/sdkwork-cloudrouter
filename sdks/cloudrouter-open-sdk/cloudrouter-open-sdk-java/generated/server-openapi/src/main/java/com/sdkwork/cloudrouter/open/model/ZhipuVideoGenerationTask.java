package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class ZhipuVideoGenerationTask {
    private Integer created;
    private String id;
    private List<ZhipuImageResult> imageResult;
    private String model;
    private String requestId;
    private String taskStatus;
    private List<ZhipuVideoResult> videoResult;

    public Integer getCreated() {
        return this.created;
    }

    public void setCreated(Integer created) {
        this.created = created;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<ZhipuImageResult> getImageResult() {
        return this.imageResult;
    }

    public void setImageResult(List<ZhipuImageResult> imageResult) {
        this.imageResult = imageResult;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getTaskStatus() {
        return this.taskStatus;
    }

    public void setTaskStatus(String taskStatus) {
        this.taskStatus = taskStatus;
    }

    public List<ZhipuVideoResult> getVideoResult() {
        return this.videoResult;
    }

    public void setVideoResult(List<ZhipuVideoResult> videoResult) {
        this.videoResult = videoResult;
    }
}
