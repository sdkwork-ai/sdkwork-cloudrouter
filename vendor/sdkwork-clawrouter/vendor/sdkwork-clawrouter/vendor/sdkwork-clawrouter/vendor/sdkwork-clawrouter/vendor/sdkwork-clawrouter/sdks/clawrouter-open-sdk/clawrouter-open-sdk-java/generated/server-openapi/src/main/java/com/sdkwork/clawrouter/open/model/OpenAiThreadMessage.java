package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiThreadMessage {
    private String assistantId;
    private List<String> attachments;
    private Integer completedAt;
    private List<String> content;
    private Integer createdAt;
    private String id;
    private Integer incompleteAt;
    private String incompleteDetails;
    private Map<String, String> metadata;
    private String object;
    private String role;
    private String runId;
    private String status;
    private String threadId;

    public String getAssistantId() {
        return this.assistantId;
    }

    public void setAssistantId(String assistantId) {
        this.assistantId = assistantId;
    }

    public List<String> getAttachments() {
        return this.attachments;
    }

    public void setAttachments(List<String> attachments) {
        this.attachments = attachments;
    }

    public Integer getCompletedAt() {
        return this.completedAt;
    }

    public void setCompletedAt(Integer completedAt) {
        this.completedAt = completedAt;
    }

    public List<String> getContent() {
        return this.content;
    }

    public void setContent(List<String> content) {
        this.content = content;
    }

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getIncompleteAt() {
        return this.incompleteAt;
    }

    public void setIncompleteAt(Integer incompleteAt) {
        this.incompleteAt = incompleteAt;
    }

    public String getIncompleteDetails() {
        return this.incompleteDetails;
    }

    public void setIncompleteDetails(String incompleteDetails) {
        this.incompleteDetails = incompleteDetails;
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

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getRunId() {
        return this.runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getThreadId() {
        return this.threadId;
    }

    public void setThreadId(String threadId) {
        this.threadId = threadId;
    }
}
