package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAiResourceCreateRequest {
    private String apiEndpointCode;
    private String catalogKey;
    private String compositionMode;
    private String displayName;
    private List<AdminAiResourceMemberInput> members;
    private String modalityCode;
    private String model;
    private String providerNativeModel;
    private String resourceCode;
    private String resourceType;
    private String sortOrder;
    private String status;
    private String vendorCode;

    public String getApiEndpointCode() {
        return this.apiEndpointCode;
    }

    public void setApiEndpointCode(String apiEndpointCode) {
        this.apiEndpointCode = apiEndpointCode;
    }

    public String getCatalogKey() {
        return this.catalogKey;
    }

    public void setCatalogKey(String catalogKey) {
        this.catalogKey = catalogKey;
    }

    public String getCompositionMode() {
        return this.compositionMode;
    }

    public void setCompositionMode(String compositionMode) {
        this.compositionMode = compositionMode;
    }

    public String getDisplayName() {
        return this.displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public List<AdminAiResourceMemberInput> getMembers() {
        return this.members;
    }

    public void setMembers(List<AdminAiResourceMemberInput> members) {
        this.members = members;
    }

    public String getModalityCode() {
        return this.modalityCode;
    }

    public void setModalityCode(String modalityCode) {
        this.modalityCode = modalityCode;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getProviderNativeModel() {
        return this.providerNativeModel;
    }

    public void setProviderNativeModel(String providerNativeModel) {
        this.providerNativeModel = providerNativeModel;
    }

    public String getResourceCode() {
        return this.resourceCode;
    }

    public void setResourceCode(String resourceCode) {
        this.resourceCode = resourceCode;
    }

    public String getResourceType() {
        return this.resourceType;
    }

    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
    }

    public String getSortOrder() {
        return this.sortOrder;
    }

    public void setSortOrder(String sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getVendorCode() {
        return this.vendorCode;
    }

    public void setVendorCode(String vendorCode) {
        this.vendorCode = vendorCode;
    }
}
