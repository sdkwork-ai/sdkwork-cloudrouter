package com.sdkwork.clawrouter.backend.model;

import java.util.Map;

public class AdminMcpToolItem {
    private String createdAt;
    private String description;
    private String discoveredAt;
    private Boolean enabled;
    private String id;
    private Map<String, String> inputSchema;
    private String lastInvokedAt;
    private String name;
    private String organizationId;
    private Map<String, String> outputSchema;
    private Map<String, String> rateLimitPolicy;
    private Boolean requiresApproval;
    private String riskLevel;
    private String schemaHash;
    private String serverId;
    private String serverRevisionId;
    private Integer sortWeight;
    private String status;
    private String tenantId;
    private String toolKey;
    private String updatedAt;
    private String uuid;

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDiscoveredAt() {
        return this.discoveredAt;
    }

    public void setDiscoveredAt(String discoveredAt) {
        this.discoveredAt = discoveredAt;
    }

    public Boolean getEnabled() {
        return this.enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getInputSchema() {
        return this.inputSchema;
    }

    public void setInputSchema(Map<String, String> inputSchema) {
        this.inputSchema = inputSchema;
    }

    public String getLastInvokedAt() {
        return this.lastInvokedAt;
    }

    public void setLastInvokedAt(String lastInvokedAt) {
        this.lastInvokedAt = lastInvokedAt;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
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

    public String getSchemaHash() {
        return this.schemaHash;
    }

    public void setSchemaHash(String schemaHash) {
        this.schemaHash = schemaHash;
    }

    public String getServerId() {
        return this.serverId;
    }

    public void setServerId(String serverId) {
        this.serverId = serverId;
    }

    public String getServerRevisionId() {
        return this.serverRevisionId;
    }

    public void setServerRevisionId(String serverRevisionId) {
        this.serverRevisionId = serverRevisionId;
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

    public String getTenantId() {
        return this.tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getToolKey() {
        return this.toolKey;
    }

    public void setToolKey(String toolKey) {
        this.toolKey = toolKey;
    }

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getUuid() {
        return this.uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }
}
