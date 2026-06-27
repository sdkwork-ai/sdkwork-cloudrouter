package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiAssistant {
    private Integer createdAt;
    private String description;
    private String id;
    private String instructions;
    private Map<String, String> metadata;
    private String model;
    private String name;
    private String object;
    private String responseFormat;
    private Double temperature;
    private String toolResources;
    private List<String> tools;
    private Double topP;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
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

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(String responseFormat) {
        this.responseFormat = responseFormat;
    }

    public Double getTemperature() {
        return this.temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public String getToolResources() {
        return this.toolResources;
    }

    public void setToolResources(String toolResources) {
        this.toolResources = toolResources;
    }

    public List<String> getTools() {
        return this.tools;
    }

    public void setTools(List<String> tools) {
        this.tools = tools;
    }

    public Double getTopP() {
        return this.topP;
    }

    public void setTopP(Double topP) {
        this.topP = topP;
    }
}
