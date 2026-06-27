package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminModelMappingRule {
    private String bindingType;
    private List<AdminModelMappingRuleBinding> bindings;
    private String createdAt;
    private Boolean enabled;
    private String id;
    private List<AdminModelMappingRuleItem> mappingItems;
    private String mappingMode;
    private String matchType;
    private String sourceVendorCode;
    private String sourceVendorId;
    private String targetVendorCode;
    private String targetVendorId;
    private String updatedAt;

    public String getBindingType() {
        return this.bindingType;
    }

    public void setBindingType(String bindingType) {
        this.bindingType = bindingType;
    }

    public List<AdminModelMappingRuleBinding> getBindings() {
        return this.bindings;
    }

    public void setBindings(List<AdminModelMappingRuleBinding> bindings) {
        this.bindings = bindings;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

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

    public List<AdminModelMappingRuleItem> getMappingItems() {
        return this.mappingItems;
    }

    public void setMappingItems(List<AdminModelMappingRuleItem> mappingItems) {
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

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
