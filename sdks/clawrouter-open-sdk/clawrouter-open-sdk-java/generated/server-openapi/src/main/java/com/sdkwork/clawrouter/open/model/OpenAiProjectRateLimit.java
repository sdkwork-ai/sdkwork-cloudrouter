package com.sdkwork.clawrouter.open.model;


public class OpenAiProjectRateLimit {
    private Integer batch1DayMaxInputTokens;
    private String id;
    private Integer maxImagesPer1Minute;
    private Integer maxRequestsPer1Minute;
    private Integer maxTokensPer1Minute;
    private String model;
    private String object;

    public Integer getBatch1DayMaxInputTokens() {
        return this.batch1DayMaxInputTokens;
    }

    public void setBatch1DayMaxInputTokens(Integer batch1DayMaxInputTokens) {
        this.batch1DayMaxInputTokens = batch1DayMaxInputTokens;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getMaxImagesPer1Minute() {
        return this.maxImagesPer1Minute;
    }

    public void setMaxImagesPer1Minute(Integer maxImagesPer1Minute) {
        this.maxImagesPer1Minute = maxImagesPer1Minute;
    }

    public Integer getMaxRequestsPer1Minute() {
        return this.maxRequestsPer1Minute;
    }

    public void setMaxRequestsPer1Minute(Integer maxRequestsPer1Minute) {
        this.maxRequestsPer1Minute = maxRequestsPer1Minute;
    }

    public Integer getMaxTokensPer1Minute() {
        return this.maxTokensPer1Minute;
    }

    public void setMaxTokensPer1Minute(Integer maxTokensPer1Minute) {
        this.maxTokensPer1Minute = maxTokensPer1Minute;
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
}
