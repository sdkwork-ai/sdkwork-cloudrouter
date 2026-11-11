package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class XaiVideoGenerationTask {
    private Map<String, String> error;
    private String model;
    private Integer progress;
    private String requestId;
    private String status;
    private XaiUsage usage;
    private XaiVideoUrl video;

    public Map<String, String> getError() {
        return this.error;
    }

    public void setError(Map<String, String> error) {
        this.error = error;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Integer getProgress() {
        return this.progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public XaiUsage getUsage() {
        return this.usage;
    }

    public void setUsage(XaiUsage usage) {
        this.usage = usage;
    }

    public XaiVideoUrl getVideo() {
        return this.video;
    }

    public void setVideo(XaiVideoUrl video) {
        this.video = video;
    }
}
