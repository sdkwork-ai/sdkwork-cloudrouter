package com.sdkwork.clawrouter.backend.model;

import java.util.Map;

public class AdminMcpToolUpdateRequest {
    private String description;
    private Boolean enabled;
    private Map<String, String> inputSchema;
    private String name;
    private Map<String, String> outputSchema;
    private Map<String, String> rateLimitPolicy;
    private Boolean requiresApproval;
    private String riskLevel;
    private Integer sortWeight;
    private String status;

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getEnabled() {
        return this.enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Map<String, String> getInputSchema() {
        return this.inputSchema;
    }

    public void setInputSchema(Map<String, String> inputSchema) {
        this.inputSchema = inputSchema;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Map<String, String> getOutputSchema() {
        return this.outputSchema;
    }

    public void setOutputSchema(Map<String, String> outputSchema) {
        this.outputSchema = outputSchema;
    }

    public Map<String, String> getRateLimitPolicy() {
        return this.rateLimitPolicy;
    }

    public void setRateLimitPolicy(Map<String, String> rateLimitPolicy) {
        this.rateLimitPolicy = rateLimitPolicy;
    }

    public Boolean getRequiresApproval() {
        return this.requiresApproval;
    }

    public void setRequiresApproval(Boolean requiresApproval) {
        this.requiresApproval = requiresApproval;
    }

    public String getRiskLevel() {
        return this.riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public Integer getSortWeight() {
        return this.sortWeight;
    }

    public void setSortWeight(Integer sortWeight) {
        this.sortWeight = sortWeight;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
