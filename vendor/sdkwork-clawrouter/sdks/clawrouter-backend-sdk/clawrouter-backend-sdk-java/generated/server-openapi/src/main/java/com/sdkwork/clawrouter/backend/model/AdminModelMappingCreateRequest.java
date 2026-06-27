package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminModelMappingCreateRequest {
    private List<AdminModelMappingRuleBindingInput> bindings;
    private Boolean enabled;
    private List<AdminModelMappingRuleItemInput> mappingItems;
    private String mappingMode;
    private String matchType;
    private String sourceVendorCode;
    private String sourceVendorId;
    private String targetVendorCode;
    private String targetVendorId;

    public List<AdminModelMappingRuleBindingInput> getBindings() {
        return this.bindings;
    }

    public void setBindings(List<AdminModelMappingRuleBindingInput> bindings) {
        this.bindings = bindings;
    }

    public Boolean getEnabled() {
        return this.enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public List<AdminModelMappingRuleItemInput> getMappingItems() {
        return this.mappingItems;
    }

    public void setMappingItems(List<AdminModelMappingRuleItemInput> mappingItems) {
        this.mappingItems = mappingItems;
    }

    public String getMappingMode() {
        return this.mappingMode;
    }

    public void setMappingMode(String mappingMode) {
        this.mappingMode = mappingMode;
    }

    public String getMatchType() {
        return this.matchType;
    }

    public void setMatchType(String matchType) {
        this.matchType = matchType;
    }

    public String getSourceVendorCode() {
        return this.sourceVendorCode;
    }

    public void setSourceVendorCode(String sourceVendorCode) {
        this.sourceVendorCode = sourceVendorCode;
    }

    public String getSourceVendorId() {
        return this.sourceVendorId;
    }

    public void setSourceVendorId(String sourceVendorId) {
        this.sourceVendorId = sourceVendorId;
    }

    public String getTargetVendorCode() {
        return this.targetVendorCode;
    }

    public void setTargetVendorCode(String targetVendorCode) {
        this.targetVendorCode = targetVendorCode;
    }

    public String getTargetVendorId() {
        return this.targetVendorId;
    }

    public void setTargetVendorId(String targetVendorId) {
        this.targetVendorId = targetVendorId;
    }
}
