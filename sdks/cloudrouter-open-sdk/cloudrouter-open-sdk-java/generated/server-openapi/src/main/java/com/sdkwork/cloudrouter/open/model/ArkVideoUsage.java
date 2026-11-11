package com.sdkwork.cloudrouter.open.model;


public class ArkVideoUsage {
    private Integer completionTokens;
    private ArkVideoToolUsage toolUsage;
    private Integer totalTokens;

    public Integer getCompletionTokens() {
        return this.completionTokens;
    }

    public void setCompletionTokens(Integer completionTokens) {
        this.completionTokens = completionTokens;
    }

    public ArkVideoToolUsage getToolUsage() {
        return this.toolUsage;
    }

    public void setToolUsage(ArkVideoToolUsage toolUsage) {
        this.toolUsage = toolUsage;
    }

    public Integer getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(Integer totalTokens) {
        this.totalTokens = totalTokens;
    }
}
