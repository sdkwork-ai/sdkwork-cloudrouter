package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiContainerCreateRequest {
    private Map<String, String> expiresAfter;
    private List<String> fileIds;
    private String memoryLimit;
    private String name;
    private Map<String, String> networkPolicy;
    private List<Map<String, String>> skills;

    public Map<String, String> getExpiresAfter() {
        return this.expiresAfter;
    }

    public void setExpiresAfter(Map<String, String> expiresAfter) {
        this.expiresAfter = expiresAfter;
    }

    public List<String> getFileIds() {
        return this.fileIds;
    }

    public void setFileIds(List<String> fileIds) {
        this.fileIds = fileIds;
    }

    public String getMemoryLimit() {
        return this.memoryLimit;
    }

    public void setMemoryLimit(String memoryLimit) {
        this.memoryLimit = memoryLimit;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Map<String, String> getNetworkPolicy() {
        return this.networkPolicy;
    }

    public void setNetworkPolicy(Map<String, String> networkPolicy) {
        this.networkPolicy = networkPolicy;
    }

    public List<Map<String, String>> getSkills() {
        return this.skills;
    }

    public void setSkills(List<Map<String, String>> skills) {
        this.skills = skills;
    }
}
