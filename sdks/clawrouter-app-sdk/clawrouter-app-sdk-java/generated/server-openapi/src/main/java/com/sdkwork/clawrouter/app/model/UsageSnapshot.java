package com.sdkwork.clawrouter.app.model;


public class UsageSnapshot {
    private String cachedTokens;
    private String inputTokens;
    private String outputTokens;
    private String totalTokens;

    public String getCachedTokens() {
        return this.cachedTokens;
    }

    public void setCachedTokens(String cachedTokens) {
        this.cachedTokens = cachedTokens;
    }

    public String getInputTokens() {
        return this.inputTokens;
    }

    public void setInputTokens(String inputTokens) {
        this.inputTokens = inputTokens;
    }

    public String getOutputTokens() {
        return this.outputTokens;
    }

    public void setOutputTokens(String outputTokens) {
        this.outputTokens = outputTokens;
    }

    public String getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(String totalTokens) {
        this.totalTokens = totalTokens;
    }
}
