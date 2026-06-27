package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class AdminMcpBindingItem {
    private List<String> allowedTools;
    private String createdAt;
    private List<String> deniedTools;
    private Boolean enabled;
    private String id;
    private String organizationId;
    private String ownerId;
    private String ownerType;
    private Map<String, String> policyJson;
    private Integer priority;
    private String serverId;
    private String serverRevisionId;
    private Map<String, String> snapshotJson;
    private String status;
    private String tenantId;
    private String toolId;
    private String updatedAt;
    private String uuid;

    public List<String> getAllowedTools() {
        return this.allowedTools;
    }

    public void setAllowedTools(List<String> allowedTools) {
        this.allowedTools = allowedTools;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public List<String> getDeniedTools() {
        return this.deniedTools;
    }

    public void setDeniedTools(List<String> deniedTools) {
        this.deniedTools = deniedTools;
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

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getOwnerId() {
        return this.ownerId;
    }

    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }

    public String getOwnerType() {
        return this.ownerType;
    }

    public void setOwnerType(String ownerType) {
        this.ownerType = ownerType;
    }

    public Map<String, String> getPolicyJson() {
        return this.policyJson;
    }

    public void setPolicyJson(Map<String, String> policyJson) {
        this.policyJson = policyJson;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
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

    public Map<String, String> getSnapshotJson() {
        return this.snapshotJson;
    }

    public void setSnapshotJson(Map<String, String> snapshotJson) {
        this.snapshotJson = snapshotJson;
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

    public String getToolId() {
        return this.toolId;
    }

    public void setToolId(String toolId) {
        this.toolId = toolId;
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
