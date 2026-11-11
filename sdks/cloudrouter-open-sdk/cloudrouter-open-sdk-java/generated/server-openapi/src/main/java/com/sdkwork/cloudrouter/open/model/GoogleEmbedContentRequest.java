package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class GoogleEmbedContentRequest {
    private GoogleContent content;
    private Map<String, String> embedContentConfig;
    private String model;
    private Integer outputDimensionality;
    private String taskType;
    private String title;

    public GoogleContent getContent() {
        return this.content;
    }

    public void setContent(GoogleContent content) {
        this.content = content;
    }

    public Map<String, String> getEmbedContentConfig() {
        return this.embedContentConfig;
    }

    public void setEmbedContentConfig(Map<String, String> embedContentConfig) {
        this.embedContentConfig = embedContentConfig;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Integer getOutputDimensionality() {
        return this.outputDimensionality;
    }

    public void setOutputDimensionality(Integer outputDimensionality) {
        this.outputDimensionality = outputDimensionality;
    }

    public String getTaskType() {
        return this.taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
