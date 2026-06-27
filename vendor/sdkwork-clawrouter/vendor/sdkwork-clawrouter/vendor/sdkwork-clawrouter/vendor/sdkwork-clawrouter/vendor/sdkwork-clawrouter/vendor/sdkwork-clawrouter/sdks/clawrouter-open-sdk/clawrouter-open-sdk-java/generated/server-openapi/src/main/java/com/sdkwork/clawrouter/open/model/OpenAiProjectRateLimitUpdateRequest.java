package com.sdkwork.clawrouter.open.model;


public class OpenAiProjectRateLimitUpdateRequest {
    private Integer batch1DayMaxInputTokens;
    private Integer maxImagesPer1Minute;
    private Integer maxRequestsPer1Minute;
    private Integer maxTokensPer1Minute;

    public Integer getBatch1DayMaxInputTokens() {
        return this.batch1DayMaxInputTokens;
    }

    public void setBatch1DayMaxInputTokens(Integer batch1DayMaxInputTokens) {
        this.batch1DayMaxInputTokens = batch1DayMaxInputTokens;
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
}
