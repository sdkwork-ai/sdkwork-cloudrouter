package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminModelCatalogSyncResponse {
    private String acceptedCount;
    private String capabilityCount;
    private String catalogRoot;
    private String catalogVersion;
    private Boolean dryRun;
    private String familyCount;
    private String meterCount;
    private String mode;
    private String modelCount;
    private List<AdminAiModelItem> models;
    private String priceCount;
    private String rankingCount;
    private String requestedCatalogVersion;
    private String snapshotId;
    private String source;
    private String sourceHash;
    private String syncRunId;
    private Boolean synced;
    private List<String> vendorCodes;
    private String vendorCount;
    private List<AdminModelVendorItem> vendors;

    public String getAcceptedCount() {
        return this.acceptedCount;
    }

    public void setAcceptedCount(String acceptedCount) {
        this.acceptedCount = acceptedCount;
    }

    public String getCapabilityCount() {
        return this.capabilityCount;
    }

    public void setCapabilityCount(String capabilityCount) {
        this.capabilityCount = capabilityCount;
    }

    public String getCatalogRoot() {
        return this.catalogRoot;
    }

    public void setCatalogRoot(String catalogRoot) {
        this.catalogRoot = catalogRoot;
    }

    public String getCatalogVersion() {
        return this.catalogVersion;
    }

    public void setCatalogVersion(String catalogVersion) {
        this.catalogVersion = catalogVersion;
    }

    public Boolean getDryRun() {
        return this.dryRun;
    }

    public void setDryRun(Boolean dryRun) {
        this.dryRun = dryRun;
    }

    public String getFamilyCount() {
        return this.familyCount;
    }

    public void setFamilyCount(String familyCount) {
        this.familyCount = familyCount;
    }

    public String getMeterCount() {
        return this.meterCount;
    }

    public void setMeterCount(String meterCount) {
        this.meterCount = meterCount;
    }

    public String getMode() {
        return this.mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getModelCount() {
        return this.modelCount;
    }

    public void setModelCount(String modelCount) {
        this.modelCount = modelCount;
    }

    public List<AdminAiModelItem> getModels() {
        return this.models;
    }

    public void setModels(List<AdminAiModelItem> models) {
        this.models = models;
    }

    public String getPriceCount() {
        return this.priceCount;
    }

    public void setPriceCount(String priceCount) {
        this.priceCount = priceCount;
    }

    public String getRankingCount() {
        return this.rankingCount;
    }

    public void setRankingCount(String rankingCount) {
        this.rankingCount = rankingCount;
    }

    public String getRequestedCatalogVersion() {
        return this.requestedCatalogVersion;
    }

    public void setRequestedCatalogVersion(String requestedCatalogVersion) {
        this.requestedCatalogVersion = requestedCatalogVersion;
    }

    public String getSnapshotId() {
        return this.snapshotId;
    }

    public void setSnapshotId(String snapshotId) {
        this.snapshotId = snapshotId;
    }

    public String getSource() {
        return this.source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getSourceHash() {
        return this.sourceHash;
    }

    public void setSourceHash(String sourceHash) {
        this.sourceHash = sourceHash;
    }

    public String getSyncRunId() {
        return this.syncRunId;
    }

    public void setSyncRunId(String syncRunId) {
        this.syncRunId = syncRunId;
    }

    public Boolean getSynced() {
        return this.synced;
    }

    public void setSynced(Boolean synced) {
        this.synced = synced;
    }

    public List<String> getVendorCodes() {
        return this.vendorCodes;
    }

    public void setVendorCodes(List<String> vendorCodes) {
        this.vendorCodes = vendorCodes;
    }

    public String getVendorCount() {
        return this.vendorCount;
    }

    public void setVendorCount(String vendorCount) {
        this.vendorCount = vendorCount;
    }

    public List<AdminModelVendorItem> getVendors() {
        return this.vendors;
    }

    public void setVendors(List<AdminModelVendorItem> vendors) {
        this.vendors = vendors;
    }
}
