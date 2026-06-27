package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminChannelGroupRouteExplainResponse {
    private Integer activeHealthyBindingCount;
    private List<String> apiScope;
    private List<String> capabilities;
    private Integer configuredResourceAccessCount;
    private Integer configuredResourceGroupAccessCount;
    private List<String> effectiveResourceCodes;
    private List<String> issueCodes;
    private List<AdminChannelGroupRouteExplainIssue> issues;
    private Boolean ready;
    private List<String> resourceCodes;
    private List<String> resourceGroupCodes;
    private Integer routableBindingCount;
    private String source;

    public Integer getActiveHealthyBindingCount() {
        return this.activeHealthyBindingCount;
    }

    public void setActiveHealthyBindingCount(Integer activeHealthyBindingCount) {
        this.activeHealthyBindingCount = activeHealthyBindingCount;
    }

    public List<String> getApiScope() {
        return this.apiScope;
    }

    public void setApiScope(List<String> apiScope) {
        this.apiScope = apiScope;
    }

    public List<String> getCapabilities() {
        return this.capabilities;
    }

    public void setCapabilities(List<String> capabilities) {
        this.capabilities = capabilities;
    }

    public Integer getConfiguredResourceAccessCount() {
        return this.configuredResourceAccessCount;
    }

    public void setConfiguredResourceAccessCount(Integer configuredResourceAccessCount) {
        this.configuredResourceAccessCount = configuredResourceAccessCount;
    }

    public Integer getConfiguredResourceGroupAccessCount() {
        return this.configuredResourceGroupAccessCount;
    }

    public void setConfiguredResourceGroupAccessCount(Integer configuredResourceGroupAccessCount) {
        this.configuredResourceGroupAccessCount = configuredResourceGroupAccessCount;
    }

    public List<String> getEffectiveResourceCodes() {
        return this.effectiveResourceCodes;
    }

    public void setEffectiveResourceCodes(List<String> effectiveResourceCodes) {
        this.effectiveResourceCodes = effectiveResourceCodes;
    }

    public List<String> getIssueCodes() {
        return this.issueCodes;
    }

    public void setIssueCodes(List<String> issueCodes) {
        this.issueCodes = issueCodes;
    }

    public List<AdminChannelGroupRouteExplainIssue> getIssues() {
        return this.issues;
    }

    public void setIssues(List<AdminChannelGroupRouteExplainIssue> issues) {
        this.issues = issues;
    }

    public Boolean getReady() {
        return this.ready;
    }

    public void setReady(Boolean ready) {
        this.ready = ready;
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

    public Integer getRoutableBindingCount() {
        return this.routableBindingCount;
    }

    public void setRoutableBindingCount(Integer routableBindingCount) {
        this.routableBindingCount = routableBindingCount;
    }

    public String getSource() {
        return this.source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
