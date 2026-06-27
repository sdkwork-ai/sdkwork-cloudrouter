package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class AdminPromptVersionItem {
    private String checksumHash;
    private String content;
    private String createdAt;
    private String createdBy;
    private List<Map<String, String>> examplesJson;
    private String id;
    private String lifecycleStatus;
    private Map<String, String> modelConstraints;
    private String organizationId;
    private Map<String, String> outputSchema;
    private String promptId;
    private String publishedAt;
    private String reviewComment;
    private String reviewStatus;
    private Map<String, String> safetyPolicy;
    private String tenantId;
    private String title;
    private String updatedAt;
    private String uuid;
    private Map<String, String> variableSchema;
    private String versionNo;

    public String getChecksumHash() {
        return this.checksumHash;
    }

    public void setChecksumHash(String checksumHash) {
        this.checksumHash = checksumHash;
    }

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
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

    public List<Map<String, String>> getExamplesJson() {
        return this.examplesJson;
    }

    public void setExamplesJson(List<Map<String, String>> examplesJson) {
        this.examplesJson = examplesJson;
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

    public Map<String, String> getModelConstraints() {
        return this.modelConstraints;
    }

    public void setModelConstraints(Map<String, String> modelConstraints) {
        this.modelConstraints = modelConstraints;
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

    public String getPromptId() {
        return this.promptId;
    }

    public void setPromptId(String promptId) {
        this.promptId = promptId;
    }

    public String getPublishedAt() {
        return this.publishedAt;
    }

    public void setPublishedAt(String publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getReviewComment() {
        return this.reviewComment;
    }

    public void setReviewComment(String reviewComment) {
        this.reviewComment = reviewComment;
    }

    public String getReviewStatus() {
        return this.reviewStatus;
    }

    public void setReviewStatus(String reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public Map<String, String> getSafetyPolicy() {
        return this.safetyPolicy;
    }

    public void setSafetyPolicy(Map<String, String> safetyPolicy) {
        this.safetyPolicy = safetyPolicy;
    }

    public String getTenantId() {
        return this.tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
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

    public Map<String, String> getVariableSchema() {
        return this.variableSchema;
    }

    public void setVariableSchema(Map<String, String> variableSchema) {
        this.variableSchema = variableSchema;
    }

    public String getVersionNo() {
        return this.versionNo;
    }

    public void setVersionNo(String versionNo) {
        this.versionNo = versionNo;
    }
}
