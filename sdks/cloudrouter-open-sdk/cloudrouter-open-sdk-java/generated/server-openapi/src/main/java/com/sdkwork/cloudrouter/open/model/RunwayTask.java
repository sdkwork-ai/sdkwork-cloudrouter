package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class RunwayTask {
    private String createdAt;
    private String failure;
    private String failureCode;
    private String id;
    private List<String> output;
    private Double progress;
    private String status;

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getFailure() {
        return this.failure;
    }

    public void setFailure(String failure) {
        this.failure = failure;
    }

    public String getFailureCode() {
        return this.failureCode;
    }

    public void setFailureCode(String failureCode) {
        this.failureCode = failureCode;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<String> getOutput() {
        return this.output;
    }

    public void setOutput(List<String> output) {
        this.output = output;
    }

    public Double getProgress() {
        return this.progress;
    }

    public void setProgress(Double progress) {
        this.progress = progress;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
