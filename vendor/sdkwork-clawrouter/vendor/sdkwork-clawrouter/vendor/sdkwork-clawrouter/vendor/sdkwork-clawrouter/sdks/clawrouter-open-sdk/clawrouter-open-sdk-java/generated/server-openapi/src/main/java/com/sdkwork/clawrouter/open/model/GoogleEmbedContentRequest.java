package com.sdkwork.clawrouter.open.model;


public class GoogleEmbedContentRequest {
    private GoogleContent content;
    private Integer outputDimensionality;
    private String taskType;
    private String title;

    public GoogleContent getContent() {
        return this.content;
    }

    public void setContent(GoogleContent content) {
        this.content = content;
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
