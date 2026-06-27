package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiFineTuningJobCreateRequest {
    private String hyperparameters;
    private List<String> integrations;
    private Map<String, String> metadata;
    private String model;
    private Integer seed;
    private String suffix;
    private String trainingFile;
    private String validationFile;

    public String getHyperparameters() {
        return this.hyperparameters;
    }

    public void setHyperparameters(String hyperparameters) {
        this.hyperparameters = hyperparameters;
    }

    public List<String> getIntegrations() {
        return this.integrations;
    }

    public void setIntegrations(List<String> integrations) {
        this.integrations = integrations;
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

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public String getSuffix() {
        return this.suffix;
    }

    public void setSuffix(String suffix) {
        this.suffix = suffix;
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
