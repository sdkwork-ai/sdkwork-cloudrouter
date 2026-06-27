package com.sdkwork.clawrouter.open.model;


public class OpenAiFineTuningJobCheckpoint {
    private Integer createdAt;
    private String fineTunedModelCheckpoint;
    private String fineTuningJobId;
    private String id;
    private String metrics;
    private String object;
    private Integer stepNumber;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getFineTunedModelCheckpoint() {
        return this.fineTunedModelCheckpoint;
    }

    public void setFineTunedModelCheckpoint(String fineTunedModelCheckpoint) {
        this.fineTunedModelCheckpoint = fineTunedModelCheckpoint;
    }

    public String getFineTuningJobId() {
        return this.fineTuningJobId;
    }

    public void setFineTuningJobId(String fineTuningJobId) {
        this.fineTuningJobId = fineTuningJobId;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMetrics() {
        return this.metrics;
    }

    public void setMetrics(String metrics) {
        this.metrics = metrics;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public Integer getStepNumber() {
        return this.stepNumber;
    }

    public void setStepNumber(Integer stepNumber) {
        this.stepNumber = stepNumber;
    }
}
