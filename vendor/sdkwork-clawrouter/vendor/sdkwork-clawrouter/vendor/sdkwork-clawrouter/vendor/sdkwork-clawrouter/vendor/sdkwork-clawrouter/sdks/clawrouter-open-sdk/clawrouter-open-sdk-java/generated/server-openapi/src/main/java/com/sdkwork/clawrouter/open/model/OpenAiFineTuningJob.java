package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiFineTuningJob {
    private Integer createdAt;
    private String error;
    private String fineTunedModel;
    private Integer finishedAt;
    private String hyperparameters;
    private String id;
    private Map<String, String> metadata;
    private String model;
    private String object;
    private String organizationId;
    private List<String> resultFiles;
    private String status;
    private Integer trainedTokens;
    private String trainingFile;
    private String validationFile;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getError() {
        return this.error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getFineTunedModel() {
        return this.fineTunedModel;
    }

    public void setFineTunedModel(String fineTunedModel) {
        this.fineTunedModel = fineTunedModel;
    }

    public Integer getFinishedAt() {
        return this.finishedAt;
    }

    public void setFinishedAt(Integer finishedAt) {
        this.finishedAt = finishedAt;
    }

    public String getHyperparameters() {
        return this.hyperparameters;
    }

    public void setHyperparameters(String hyperparameters) {
        this.hyperparameters = hyperparameters;
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

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
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

    public Integer getTrainedTokens() {
        return this.trainedTokens;
    }

    public void setTrainedTokens(Integer trainedTokens) {
        this.trainedTokens = trainedTokens;
    }

    public String getTrainingFile() {
        return this.trainingFile;
    }

    public void setTrainingFile(String trainingFile) {
        this.trainingFile = trainingFile;
    }

    public String getValidationFile() {
        return this.validationFile;
    }

    public void setValidationFile(String validationFile) {
        this.validationFile = validationFile;
    }
}
