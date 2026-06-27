package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminChannelGroupItem {
    private AdminCountPair accountCount;
    private AdminCapacityPair capacity;
    private String groupCode;
    private String groupName;
    private String groupType;
    private String id;
    private Double officialPriceMultiplier;
    private String priceReferenceMode;
    private String providerCode;
    private Double rateMultiplier;
    private List<String> resourceCodes;
    private List<String> resourceGroupCodes;
    private String status;
    private AdminUsagePair usage;

    public AdminCountPair getAccountCount() {
        return this.accountCount;
    }

    public void setAccountCount(AdminCountPair accountCount) {
        this.accountCount = accountCount;
    }

    public AdminCapacityPair getCapacity() {
        return this.capacity;
    }

    public void setCapacity(AdminCapacityPair capacity) {
        this.capacity = capacity;
    }

    public String getGroupCode() {
        return this.groupCode;
    }

    public void setGroupCode(String groupCode) {
        this.groupCode = groupCode;
    }

    public String getGroupName() {
        return this.groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public String getGroupType() {
        return this.groupType;
    }

    public void setGroupType(String groupType) {
        this.groupType = groupType;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Double getOfficialPriceMultiplier() {
        return this.officialPriceMultiplier;
    }

    public void setOfficialPriceMultiplier(Double officialPriceMultiplier) {
        this.officialPriceMultiplier = officialPriceMultiplier;
    }

    public String getPriceReferenceMode() {
        return this.priceReferenceMode;
    }

    public void setPriceReferenceMode(String priceReferenceMode) {
        this.priceReferenceMode = priceReferenceMode;
    }

    public String getProviderCode() {
        return this.providerCode;
    }

    public void setProviderCode(String providerCode) {
        this.providerCode = providerCode;
    }

    public Double getRateMultiplier() {
        return this.rateMultiplier;
    }

    public void setRateMultiplier(Double rateMultiplier) {
        this.rateMultiplier = rateMultiplier;
    }

    public List<String> getResourceCodes() {
        return this.resourceCodes;
    }

    public void setResourceCodes(List<String> resourceCodes) {
        this.resourceCodes = resourceCodes;
    }

    public List<String> getResourceGroupCodes() {
        return this.resourceGroupCodes;
    }

    public void setResourceGroupCodes(List<String> resourceGroupCodes) {
        this.resourceGroupCodes = resourceGroupCodes;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public AdminUsagePair getUsage() {
        return this.usage;
    }

    public void setUsage(AdminUsagePair usage) {
        this.usage = usage;
    }
}
