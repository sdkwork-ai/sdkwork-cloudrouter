package com.sdkwork.clawrouter.backend.model;

import java.util.Map;

public class AdminPromptBindingItem {
    private String bindingRole;
    private String createdAt;
    private Boolean enabled;
    private String id;
    private String organizationId;
    private String ownerId;
    private String ownerType;
    private Map<String, String> policyJson;
    private Integer priority;
    private String promptId;
    private String promptVersionId;
    private Map<String, String> snapshotJson;
    private String tenantId;
    private String updatedAt;
    private String uuid;

    public String getBindingRole() {
        return this.bindingRole;
    }

    public void setBindingRole(String bindingRole) {
        this.bindingRole = bindingRole;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
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

    public String getPromptId() {
        return this.promptId;
    }

    public void setPromptId(String promptId) {
        this.promptId = promptId;
    }

    public String getPromptVersionId() {
        return this.promptVersionId;
    }

    public void setPromptVersionId(String promptVersionId) {
        this.promptVersionId = promptVersionId;
    }

    public Map<String, String> getSnapshotJson() {
        return this.snapshotJson;
    }

    public void setSnapshotJson(Map<String, String> snapshotJson) {
        this.snapshotJson = snapshotJson;
    }

    public String getTenantId() {
        return this.tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
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
