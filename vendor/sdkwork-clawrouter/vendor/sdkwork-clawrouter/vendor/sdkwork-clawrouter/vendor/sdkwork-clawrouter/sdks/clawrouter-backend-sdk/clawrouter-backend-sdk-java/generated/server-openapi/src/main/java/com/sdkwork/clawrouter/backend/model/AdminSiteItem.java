package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminSiteItem {
    private String baseUrl;
    private String consecutiveErrorCount;
    private String description;
    private String displayName;
    private String docsUrl;
    private List<String> domains;
    private String environment;
    private String healthStatus;
    private String id;
    private String lastCheckedAt;
    private String lastLatencyMs;
    private String lastSyncAt;
    private MediaResource logo;
    private String ownerKind;
    private String regionCode;
    private String siteCode;
    private String siteName;
    private String siteType;
    private String sortOrder;
    private String status;
    private List<String> vendorCodes;
    private String websiteUrl;

    public String getBaseUrl() {
        return this.baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getConsecutiveErrorCount() {
        return this.consecutiveErrorCount;
    }

    public void setConsecutiveErrorCount(String consecutiveErrorCount) {
        this.consecutiveErrorCount = consecutiveErrorCount;
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

    public String getDocsUrl() {
        return this.docsUrl;
    }

    public void setDocsUrl(String docsUrl) {
        this.docsUrl = docsUrl;
    }

    public List<String> getDomains() {
        return this.domains;
    }

    public void setDomains(List<String> domains) {
        this.domains = domains;
    }

    public String getEnvironment() {
        return this.environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getHealthStatus() {
        return this.healthStatus;
    }

    public void setHealthStatus(String healthStatus) {
        this.healthStatus = healthStatus;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLastCheckedAt() {
        return this.lastCheckedAt;
    }

    public void setLastCheckedAt(String lastCheckedAt) {
        this.lastCheckedAt = lastCheckedAt;
    }

    public String getLastLatencyMs() {
        return this.lastLatencyMs;
    }

    public void setLastLatencyMs(String lastLatencyMs) {
        this.lastLatencyMs = lastLatencyMs;
    }

    public String getLastSyncAt() {
        return this.lastSyncAt;
    }

    public void setLastSyncAt(String lastSyncAt) {
        this.lastSyncAt = lastSyncAt;
    }

    public MediaResource getLogo() {
        return this.logo;
    }

    public void setLogo(MediaResource logo) {
        this.logo = logo;
    }

    public String getOwnerKind() {
        return this.ownerKind;
    }

    public void setOwnerKind(String ownerKind) {
        this.ownerKind = ownerKind;
    }

    public String getRegionCode() {
        return this.regionCode;
    }

    public void setRegionCode(String regionCode) {
        this.regionCode = regionCode;
    }

    public String getSiteCode() {
        return this.siteCode;
    }

    public void setSiteCode(String siteCode) {
        this.siteCode = siteCode;
    }

    public String getSiteName() {
        return this.siteName;
    }

    public void setSiteName(String siteName) {
        this.siteName = siteName;
    }

    public String getSiteType() {
        return this.siteType;
    }

    public void setSiteType(String siteType) {
        this.siteType = siteType;
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

    public List<String> getVendorCodes() {
        return this.vendorCodes;
    }

    public void setVendorCodes(List<String> vendorCodes) {
        this.vendorCodes = vendorCodes;
    }

    public String getWebsiteUrl() {
        return this.websiteUrl;
    }

    public void setWebsiteUrl(String websiteUrl) {
        this.websiteUrl = websiteUrl;
    }
}
