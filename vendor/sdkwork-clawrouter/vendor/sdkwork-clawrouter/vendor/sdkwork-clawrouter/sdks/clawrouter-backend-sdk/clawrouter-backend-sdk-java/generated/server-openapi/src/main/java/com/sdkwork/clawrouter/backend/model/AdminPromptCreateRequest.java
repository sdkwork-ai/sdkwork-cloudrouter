package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminPromptCreateRequest {
    private String categoryId;
    private String description;
    private String name;
    private String promptKey;
    private String promptType;
    private List<String> tags;
    private String visibility;

    public String getCategoryId() {
        return this.categoryId;
    }

    public void setCategoryId(String categoryId) {
        this.categoryId = categoryId;
    }

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPromptKey() {
        return this.promptKey;
    }

    public void setPromptKey(String promptKey) {
        this.promptKey = promptKey;
    }

    public String getPromptType() {
        return this.promptType;
    }

    public void setPromptType(String promptType) {
        this.promptType = promptType;
    }

    public List<String> getTags() {
        return this.tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getVisibility() {
        return this.visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }
}
