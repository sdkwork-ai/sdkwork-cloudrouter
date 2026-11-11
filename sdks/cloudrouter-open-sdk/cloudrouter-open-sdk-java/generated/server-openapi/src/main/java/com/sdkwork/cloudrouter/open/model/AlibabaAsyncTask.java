package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class AlibabaAsyncTask {
    private String code;
    private String endTime;
    private String message;
    private String origPrompt;
    private List<ProviderGeneratedMedia> results;
    private String scheduledTime;
    private String submitTime;
    private String taskId;
    private String taskStatus;
    private String videoUrl;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getEndTime() {
        return this.endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getMessage() {
        return this.message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getOrigPrompt() {
        return this.origPrompt;
    }

    public void setOrigPrompt(String origPrompt) {
        this.origPrompt = origPrompt;
    }

    public List<ProviderGeneratedMedia> getResults() {
        return this.results;
    }

    public void setResults(List<ProviderGeneratedMedia> results) {
        this.results = results;
    }

    public String getScheduledTime() {
        return this.scheduledTime;
    }

    public void setScheduledTime(String scheduledTime) {
        this.scheduledTime = scheduledTime;
    }

    public String getSubmitTime() {
        return this.submitTime;
    }

    public void setSubmitTime(String submitTime) {
        this.submitTime = submitTime;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTaskStatus() {
        return this.taskStatus;
    }

    public void setTaskStatus(String taskStatus) {
        this.taskStatus = taskStatus;
    }

    public String getVideoUrl() {
        return this.videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }
}
