package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiOrganizationAuditLog {
    private String actor;
    private String apiKeyId;
    private Integer effectiveAt;
    private String id;
    private Map<String, String> metadata;
    private String object;
    private String project;
    private String request;
    private String type;

    public String getActor() {
        return this.actor;
    }

    public void setActor(String actor) {
        this.actor = actor;
    }

    public String getApiKeyId() {
        return this.apiKeyId;
    }

    public void setApiKeyId(String apiKeyId) {
        this.apiKeyId = apiKeyId;
    }

    public Integer getEffectiveAt() {
        return this.effectiveAt;
    }

    public void setEffectiveAt(Integer effectiveAt) {
        this.effectiveAt = effectiveAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getProject() {
        return this.project;
    }

    public void setProject(String project) {
        this.project = project;
    }

    public String getRequest() {
        return this.request;
    }

    public void setRequest(String request) {
        this.request = request;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
