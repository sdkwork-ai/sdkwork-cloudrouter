package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class ListResponseInputItemsItem {
    private String content;
    private Integer created;
    private Integer createdAt;
    private String id;
    private Map<String, String> metadata;
    private String model;
    private String object;
    private List<String> output;
    private String role;
    private String status;
    private OpenAiTokenUsage usage;

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Integer getCreated() {
        return this.created;
    }

    public void setCreated(Integer created) {
        this.created = created;
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

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public List<String> getOutput() {
        return this.output;
    }

    public void setOutput(List<String> output) {
        this.output = output;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OpenAiTokenUsage getUsage() {
        return this.usage;
    }

    public void setUsage(OpenAiTokenUsage usage) {
        this.usage = usage;
    }
}
