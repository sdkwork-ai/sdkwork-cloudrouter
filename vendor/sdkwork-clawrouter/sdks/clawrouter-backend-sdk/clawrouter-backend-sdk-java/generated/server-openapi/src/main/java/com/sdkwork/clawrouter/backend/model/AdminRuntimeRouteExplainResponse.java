package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminRuntimeRouteExplainResponse {
    private String apiCode;
    private String apiKeyId;
    private String billingMeter;
    private List<AdminRuntimeRouteExplainIssue> blockedReasons;
    private Integer candidateCount;
    private String capability;
    private String catalogKey;
    private String channelGroupId;
    private String groupCode;
    private String model;
    private String policyId;
    private String policySnapshotVersion;
    private String pricingPlanCode;
    private Boolean ready;
    private String resourceCode;
    private String ruleId;
    private List<AdminRuntimeRouteExplainCandidate> selectedCandidates;
    private String source;
    private List<AdminRuntimeRouteExplainIssue> warnings;

    public String getApiCode() {
        return this.apiCode;
    }

    public void setApiCode(String apiCode) {
        this.apiCode = apiCode;
    }

    public String getApiKeyId() {
        return this.apiKeyId;
    }

    public void setApiKeyId(String apiKeyId) {
        this.apiKeyId = apiKeyId;
    }

    public String getBillingMeter() {
        return this.billingMeter;
    }

    public void setBillingMeter(String billingMeter) {
        this.billingMeter = billingMeter;
    }

    public List<AdminRuntimeRouteExplainIssue> getBlockedReasons() {
        return this.blockedReasons;
    }

    public void setBlockedReasons(List<AdminRuntimeRouteExplainIssue> blockedReasons) {
        this.blockedReasons = blockedReasons;
    }

    public Integer getCandidateCount() {
        return this.candidateCount;
    }

    public void setCandidateCount(Integer candidateCount) {
        this.candidateCount = candidateCount;
    }

    public String getCapability() {
        return this.capability;
    }

    public void setCapability(String capability) {
        this.capability = capability;
    }

    public String getCatalogKey() {
        return this.catalogKey;
    }

    public void setCatalogKey(String catalogKey) {
        this.catalogKey = catalogKey;
    }

    public String getChannelGroupId() {
        return this.channelGroupId;
    }

    public void setChannelGroupId(String channelGroupId) {
        this.channelGroupId = channelGroupId;
    }

    public String getGroupCode() {
        return this.groupCode;
    }

    public void setGroupCode(String groupCode) {
        this.groupCode = groupCode;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPolicyId() {
        return this.policyId;
    }

    public void setPolicyId(String policyId) {
        this.policyId = policyId;
    }

    public String getPolicySnapshotVersion() {
        return this.policySnapshotVersion;
    }

    public void setPolicySnapshotVersion(String policySnapshotVersion) {
        this.policySnapshotVersion = policySnapshotVersion;
    }

    public String getPricingPlanCode() {
        return this.pricingPlanCode;
    }

    public void setPricingPlanCode(String pricingPlanCode) {
        this.pricingPlanCode = pricingPlanCode;
    }

    public Boolean getReady() {
        return this.ready;
    }

    public void setReady(Boolean ready) {
        this.ready = ready;
    }

    public String getResourceCode() {
        return this.resourceCode;
    }

    public void setResourceCode(String resourceCode) {
        this.resourceCode = resourceCode;
    }

    public String getRuleId() {
        return this.ruleId;
    }

    public void setRuleId(String ruleId) {
        this.ruleId = ruleId;
    }

    public List<AdminRuntimeRouteExplainCandidate> getSelectedCandidates() {
        return this.selectedCandidates;
    }

    public void setSelectedCandidates(List<AdminRuntimeRouteExplainCandidate> selectedCandidates) {
        this.selectedCandidates = selectedCandidates;
    }

    public String getSource() {
        return this.source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public List<AdminRuntimeRouteExplainIssue> getWarnings() {
        return this.warnings;
    }

    public void setWarnings(List<AdminRuntimeRouteExplainIssue> warnings) {
        this.warnings = warnings;
    }
}
