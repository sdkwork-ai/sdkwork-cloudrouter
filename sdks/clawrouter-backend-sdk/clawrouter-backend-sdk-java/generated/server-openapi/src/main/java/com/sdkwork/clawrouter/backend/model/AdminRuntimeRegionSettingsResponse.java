package com.sdkwork.clawrouter.backend.model;


public class AdminRuntimeRegionSettingsResponse {
    private String currentRegionCode;
    private String currentRegionName;
    private String remark;

    public String getCurrentRegionCode() {
        return this.currentRegionCode;
    }

    public void setCurrentRegionCode(String currentRegionCode) {
        this.currentRegionCode = currentRegionCode;
    }

    public String getCurrentRegionName() {
        return this.currentRegionName;
    }

    public void setCurrentRegionName(String currentRegionName) {
        this.currentRegionName = currentRegionName;
    }

    public String getRemark() {
        return this.remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }
}
