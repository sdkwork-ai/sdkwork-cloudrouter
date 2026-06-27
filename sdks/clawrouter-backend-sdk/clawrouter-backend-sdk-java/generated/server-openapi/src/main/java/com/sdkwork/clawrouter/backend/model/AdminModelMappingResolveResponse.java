package com.sdkwork.clawrouter.backend.model;


public class AdminModelMappingResolveResponse {
    private Boolean matched;
    private String matchedBindingType;
    private AdminModelMappingRule rule;
    private String sourceModel;
    private String targetCatalogKey;
    private String targetModel;
    private String targetProviderModel;
    private String targetProviderNativeModel;
    private String targetVendorCode;

    public Boolean getMatched() {
        return this.matched;
    }

    public void setMatched(Boolean matched) {
        this.matched = matched;
    }

    public String getMatchedBindingType() {
        return this.matchedBindingType;
    }

    public void setMatchedBindingType(String matchedBindingType) {
        this.matchedBindingType = matchedBindingType;
    }

    public AdminModelMappingRule getRule() {
        return this.rule;
    }

    public void setRule(AdminModelMappingRule rule) {
        this.rule = rule;
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

    public String getTargetVendorCode() {
        return this.targetVendorCode;
    }

    public void setTargetVendorCode(String targetVendorCode) {
        this.targetVendorCode = targetVendorCode;
    }
}
