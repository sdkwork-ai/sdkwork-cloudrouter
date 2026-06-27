package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminModelCatalogSyncRequest {
    private String catalogRoot;
    private String catalogVersion;
    private Boolean force;
    private String mode;
    private String source;
    private List<String> vendorCodes;

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

    public Boolean getForce() {
        return this.force;
    }

    public void setForce(Boolean force) {
        this.force = force;
    }

    public String getMode() {
        return this.mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getSource() {
        return this.source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public List<String> getVendorCodes() {
        return this.vendorCodes;
    }

    public void setVendorCodes(List<String> vendorCodes) {
        this.vendorCodes = vendorCodes;
    }
}
