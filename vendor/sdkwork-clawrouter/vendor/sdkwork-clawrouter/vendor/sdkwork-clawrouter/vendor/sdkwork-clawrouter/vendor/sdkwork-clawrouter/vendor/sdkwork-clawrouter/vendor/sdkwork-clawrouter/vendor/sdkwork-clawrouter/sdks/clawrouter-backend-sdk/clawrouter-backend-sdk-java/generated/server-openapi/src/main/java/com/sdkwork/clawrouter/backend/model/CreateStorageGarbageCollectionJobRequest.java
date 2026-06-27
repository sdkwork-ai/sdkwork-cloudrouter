package com.sdkwork.clawrouter.backend.model;

import java.util.Map;

public class CreateStorageGarbageCollectionJobRequest {
    private Map<String, String> criteria;
    private Boolean dryRun;
    private String dryRunSample;
    private String jobType;
    private String retentionWindow;
    private String target;

    public Map<String, String> getCriteria() {
        return this.criteria;
    }

    public void setCriteria(Map<String, String> criteria) {
        this.criteria = criteria;
    }

    public Boolean getDryRun() {
        return this.dryRun;
    }

    public void setDryRun(Boolean dryRun) {
        this.dryRun = dryRun;
    }

    public String getDryRunSample() {
        return this.dryRunSample;
    }

    public void setDryRunSample(String dryRunSample) {
        this.dryRunSample = dryRunSample;
    }

    public String getJobType() {
        return this.jobType;
    }

    public void setJobType(String jobType) {
        this.jobType = jobType;
    }

    public String getRetentionWindow() {
        return this.retentionWindow;
    }

    public void setRetentionWindow(String retentionWindow) {
        this.retentionWindow = retentionWindow;
    }

    public String getTarget() {
        return this.target;
    }

    public void setTarget(String target) {
        this.target = target;
    }
}
