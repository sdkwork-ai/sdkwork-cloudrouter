package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class AdminMcpServerRevisionItem {
    private List<String> argsJson;
    private String authType;
    private String command;
    private String configHash;
    private String createdAt;
    private String createdBy;
    private String deprecatedAt;
    private String endpointUrl;
    private Map<String, String> envSchema;
    private String id;
    private String lifecycleStatus;
    private String organizationId;
    private String publishedAt;
    private Map<String, String> retryPolicy;
    private String revisionNo;
    private String secretRef;
    private String serverId;
    private String status;
    private String tenantId;
    private Integer timeoutMs;
    private String transport;
    private String updatedAt;
    private String uuid;

    public List<String> getArgsJson() {
        return this.argsJson;
    }

    public void setArgsJson(List<String> argsJson) {
        this.argsJson = argsJson;
    }

    public String getAuthType() {
        return this.authType;
    }

    public void setAuthType(String authType) {
        this.authType = authType;
    }

    public String getCommand() {
        return this.command;
    }

    public void setCommand(String command) {
        this.command = command;
    }

    public String getConfigHash() {
        return this.configHash;
    }

    public void setConfigHash(String configHash) {
        this.configHash = configHash;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return this.createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getDeprecatedAt() {
        return this.deprecatedAt;
    }

    public void setDeprecatedAt(String deprecatedAt) {
        this.deprecatedAt = deprecatedAt;
    }

    public String getEndpointUrl() {
        return this.endpointUrl;
    }

    public void setEndpointUrl(String endpointUrl) {
        this.endpointUrl = endpointUrl;
    }

    public Map<String, String> getEnvSchema() {
        return this.envSchema;
    }

    public void setEnvSchema(Map<String, String> envSchema) {
        this.envSchema = envSchema;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLifecycleStatus() {
        return this.lifecycleStatus;
    }

    public void setLifecycleStatus(String lifecycleStatus) {
        this.lifecycleStatus = lifecycleStatus;
    }

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getPublishedAt() {
        return this.publishedAt;
    }

    public void setPublishedAt(String publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Map<String, String> getRetryPolicy() {
        return this.retryPolicy;
    }

    public void setRetryPolicy(Map<String, String> retryPolicy) {
        this.retryPolicy = retryPolicy;
    }

    public String getRevisionNo() {
        return this.revisionNo;
    }

    public void setRevisionNo(String revisionNo) {
        this.revisionNo = revisionNo;
    }

    public String getSecretRef() {
        return this.secretRef;
    }

    public void setSecretRef(String secretRef) {
        this.secretRef = secretRef;
    }

    public String getServerId() {
        return this.serverId;
    }

    public void setServerId(String serverId) {
        this.serverId = serverId;
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

    public Integer getTimeoutMs() {
        return this.timeoutMs;
    }

    public void setTimeoutMs(Integer timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    public String getTransport() {
        return this.transport;
    }

    public void setTransport(String transport) {
        this.transport = transport;
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
