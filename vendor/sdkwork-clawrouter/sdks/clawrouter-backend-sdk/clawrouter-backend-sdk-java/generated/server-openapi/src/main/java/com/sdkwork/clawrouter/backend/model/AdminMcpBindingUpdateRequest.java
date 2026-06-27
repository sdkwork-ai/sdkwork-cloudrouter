package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class AdminMcpBindingUpdateRequest {
    private List<String> allowedTools;
    private List<String> deniedTools;
    private Boolean enabled;
    private String ownerId;
    private String ownerType;
    private Map<String, String> policyJson;
    private Integer priority;
    private String serverRevisionId;
    private String status;
    private String toolId;

    public List<String> getAllowedTools() {
        return this.allowedTools;
    }

    public void setAllowedTools(List<String> allowedTools) {
        this.allowedTools = allowedTools;
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

    public String getServerRevisionId() {
        return this.serverRevisionId;
    }

    public void setServerRevisionId(String serverRevisionId) {
        this.serverRevisionId = serverRevisionId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getToolId() {
        return this.toolId;
    }

    public void setToolId(String toolId) {
        this.toolId = toolId;
    }
}
