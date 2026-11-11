package com.sdkwork.cloudrouter.open.model;


public class XaiUsage {
    private Integer completionTokens;
    private Integer costInUsdTicks;
    private Integer numSourcesUsed;
    private Integer promptTokens;
    private Integer totalTokens;

    public Integer getCompletionTokens() {
        return this.completionTokens;
    }

    public void setCompletionTokens(Integer completionTokens) {
        this.completionTokens = completionTokens;
    }

    public Integer getCostInUsdTicks() {
        return this.costInUsdTicks;
    }

    public void setCostInUsdTicks(Integer costInUsdTicks) {
        this.costInUsdTicks = costInUsdTicks;
    }

    public Integer getNumSourcesUsed() {
        return this.numSourcesUsed;
    }

    public void setNumSourcesUsed(Integer numSourcesUsed) {
        this.numSourcesUsed = numSourcesUsed;
    }

    public Integer getPromptTokens() {
        return this.promptTokens;
    }

    public void setPromptTokens(Integer promptTokens) {
        this.promptTokens = promptTokens;
    }

    public Integer getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(Integer totalTokens) {
        this.totalTokens = totalTokens;
    }
}
