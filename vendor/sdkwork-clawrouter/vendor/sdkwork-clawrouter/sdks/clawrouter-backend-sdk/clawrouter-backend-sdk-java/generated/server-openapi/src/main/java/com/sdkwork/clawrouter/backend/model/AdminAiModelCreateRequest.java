package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAiModelCreateRequest {
    private String apiFormat;
    private String capabilityIntro;
    private String contextTokens;
    private String description;
    private String displayName;
    private List<String> inputModalities;
    private List<String> limitations;
    private String maxOutputTokens;
    private List<String> modalities;
    private String model;
    private List<String> outputModalities;
    private List<AdminAiModelRegionPrice> regionPrices;
    private String releaseStage;
    private String replacementModel;
    private String routingState;
    private String shelfState;
    private List<String> supportedLanguages;
    private Boolean supportsJsonSchema;
    private Boolean supportsStreaming;
    private Boolean supportsTools;
    private String trainingDataCutoff;
    private String type;
    private List<String> useCases;
    private String vendorId;

    public String getApiFormat() {
        return this.apiFormat;
    }

    public void setApiFormat(String apiFormat) {
        this.apiFormat = apiFormat;
    }

    public String getCapabilityIntro() {
        return this.capabilityIntro;
    }

    public void setCapabilityIntro(String capabilityIntro) {
        this.capabilityIntro = capabilityIntro;
    }

    public String getContextTokens() {
        return this.contextTokens;
    }

    public void setContextTokens(String contextTokens) {
        this.contextTokens = contextTokens;
    }

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDisplayName() {
        return this.displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public List<String> getInputModalities() {
        return this.inputModalities;
    }

    public void setInputModalities(List<String> inputModalities) {
        this.inputModalities = inputModalities;
    }

    public List<String> getLimitations() {
        return this.limitations;
    }

    public void setLimitations(List<String> limitations) {
        this.limitations = limitations;
    }

    public String getMaxOutputTokens() {
        return this.maxOutputTokens;
    }

    public void setMaxOutputTokens(String maxOutputTokens) {
        this.maxOutputTokens = maxOutputTokens;
    }

    public List<String> getModalities() {
        return this.modalities;
    }

    public void setModalities(List<String> modalities) {
        this.modalities = modalities;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public List<String> getOutputModalities() {
        return this.outputModalities;
    }

    public void setOutputModalities(List<String> outputModalities) {
        this.outputModalities = outputModalities;
    }

    public List<AdminAiModelRegionPrice> getRegionPrices() {
        return this.regionPrices;
    }

    public void setRegionPrices(List<AdminAiModelRegionPrice> regionPrices) {
        this.regionPrices = regionPrices;
    }

    public String getReleaseStage() {
        return this.releaseStage;
    }

    public void setReleaseStage(String releaseStage) {
        this.releaseStage = releaseStage;
    }

    public String getReplacementModel() {
        return this.replacementModel;
    }

    public void setReplacementModel(String replacementModel) {
        this.replacementModel = replacementModel;
    }

    public String getRoutingState() {
        return this.routingState;
    }

    public void setRoutingState(String routingState) {
        this.routingState = routingState;
    }

    public String getShelfState() {
        return this.shelfState;
    }

    public void setShelfState(String shelfState) {
        this.shelfState = shelfState;
    }

    public List<String> getSupportedLanguages() {
        return this.supportedLanguages;
    }

    public void setSupportedLanguages(List<String> supportedLanguages) {
        this.supportedLanguages = supportedLanguages;
    }

    public Boolean getSupportsJsonSchema() {
        return this.supportsJsonSchema;
    }

    public void setSupportsJsonSchema(Boolean supportsJsonSchema) {
        this.supportsJsonSchema = supportsJsonSchema;
    }

    public Boolean getSupportsStreaming() {
        return this.supportsStreaming;
    }

    public void setSupportsStreaming(Boolean supportsStreaming) {
        this.supportsStreaming = supportsStreaming;
    }

    public Boolean getSupportsTools() {
        return this.supportsTools;
    }

    public void setSupportsTools(Boolean supportsTools) {
        this.supportsTools = supportsTools;
    }

    public String getTrainingDataCutoff() {
        return this.trainingDataCutoff;
    }

    public void setTrainingDataCutoff(String trainingDataCutoff) {
        this.trainingDataCutoff = trainingDataCutoff;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<String> getUseCases() {
        return this.useCases;
    }

    public void setUseCases(List<String> useCases) {
        this.useCases = useCases;
    }

    public String getVendorId() {
        return this.vendorId;
    }

    public void setVendorId(String vendorId) {
        this.vendorId = vendorId;
    }
}
