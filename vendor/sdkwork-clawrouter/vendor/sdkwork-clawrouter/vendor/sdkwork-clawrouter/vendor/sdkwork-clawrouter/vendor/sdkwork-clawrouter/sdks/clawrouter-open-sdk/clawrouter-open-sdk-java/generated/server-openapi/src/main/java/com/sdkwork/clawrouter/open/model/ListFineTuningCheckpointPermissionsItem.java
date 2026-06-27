package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class ListFineTuningCheckpointPermissionsItem {
    private Integer created;
    private Integer createdAt;
    private String fineTunedModel;
    private String id;
    private Map<String, String> metadata;
    private String model;
    private String object;
    private List<String> resultFiles;
    private String status;
    private String trainingFile;

    public Integer getCreated() {
        return this.created;
    }

    public void setCreated(Integer created) {
        this.created = created;
    }

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getFineTunedModel() {
        return this.fineTunedModel;
    }

    public void setFineTunedModel(String fineTunedModel) {
        this.fineTunedModel = fineTunedModel;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public List<String> getResultFiles() {
        return this.resultFiles;
    }

    public void setResultFiles(List<String> resultFiles) {
        this.resultFiles = resultFiles;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTrainingFile() {
        return this.trainingFile;
    }

    public void setTrainingFile(String trainingFile) {
        this.trainingFile = trainingFile;
    }
}
