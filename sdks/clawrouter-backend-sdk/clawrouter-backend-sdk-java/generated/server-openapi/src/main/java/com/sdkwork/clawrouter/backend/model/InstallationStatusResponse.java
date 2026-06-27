package com.sdkwork.clawrouter.backend.model;


public class InstallationStatusResponse {
    private String catalogSource;
    private String catalogVersion;
    private Boolean changed;
    private String environment;
    private Boolean externalCatalog;
    private String lastCatalogRefreshStatus;
    private String schemaVersion;
    private String seedProfile;
    private String status;

    public String getCatalogSource() {
        return this.catalogSource;
    }

    public void setCatalogSource(String catalogSource) {
        this.catalogSource = catalogSource;
    }

    public String getCatalogVersion() {
        return this.catalogVersion;
    }

    public void setCatalogVersion(String catalogVersion) {
        this.catalogVersion = catalogVersion;
    }

    public Boolean getChanged() {
        return this.changed;
    }

    public void setChanged(Boolean changed) {
        this.changed = changed;
    }

    public String getEnvironment() {
        return this.environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public Boolean getExternalCatalog() {
        return this.externalCatalog;
    }

    public void setExternalCatalog(Boolean externalCatalog) {
        this.externalCatalog = externalCatalog;
    }

    public String getLastCatalogRefreshStatus() {
        return this.lastCatalogRefreshStatus;
    }

    public void setLastCatalogRefreshStatus(String lastCatalogRefreshStatus) {
        this.lastCatalogRefreshStatus = lastCatalogRefreshStatus;
    }

    public String getSchemaVersion() {
        return this.schemaVersion;
    }

    public void setSchemaVersion(String schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public String getSeedProfile() {
        return this.seedProfile;
    }

    public void setSeedProfile(String seedProfile) {
        this.seedProfile = seedProfile;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
