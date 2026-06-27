package com.sdkwork.clawrouter.backend.model;


public class AdminModelMappingRuleItemInput {
    private Boolean enabled;
    private String id;
    private String sourceCatalogKey;
    private String sourceModel;
    private String targetCatalogKey;
    private String targetModel;
    private String targetProviderModel;
    private String targetProviderNativeModel;

    public Boolean getEnabled() {
        return this.enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSourceCatalogKey() {
        return this.sourceCatalogKey;
    }

    public void setSourceCatalogKey(String sourceCatalogKey) {
        this.sourceCatalogKey = sourceCatalogKey;
    }

    public String getSourceModel() {
        return this.sourceModel;
    }

    public void setSourceModel(String sourceModel) {
        this.sourceModel = sourceModel;
    }

    public String getTargetCatalogKey() {
        return this.targetCatalogKey;
    }

    public void setTargetCatalogKey(String targetCatalogKey) {
        this.targetCatalogKey = targetCatalogKey;
    }

    public String getTargetModel() {
        return this.targetModel;
    }

    public void setTargetModel(String targetModel) {
        this.targetModel = targetModel;
    }

    public String getTargetProviderModel() {
        return this.targetProviderModel;
    }

    public void setTargetProviderModel(String targetProviderModel) {
        this.targetProviderModel = targetProviderModel;
    }

    public String getTargetProviderNativeModel() {
        return this.targetProviderNativeModel;
    }

    public void setTargetProviderNativeModel(String targetProviderNativeModel) {
        this.targetProviderNativeModel = targetProviderNativeModel;
    }
}
