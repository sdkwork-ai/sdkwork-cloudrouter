package com.sdkwork.clawrouter.open.model;


public class AnthropicUsage {
    private Integer cacheCreationInputTokens;
    private Integer cacheReadInputTokens;
    private Integer inputTokens;
    private Integer outputTokens;

    public Integer getCacheCreationInputTokens() {
        return this.cacheCreationInputTokens;
    }

    public void setCacheCreationInputTokens(Integer cacheCreationInputTokens) {
        this.cacheCreationInputTokens = cacheCreationInputTokens;
    }

    public Integer getCacheReadInputTokens() {
        return this.cacheReadInputTokens;
    }

    public void setCacheReadInputTokens(Integer cacheReadInputTokens) {
        this.cacheReadInputTokens = cacheReadInputTokens;
    }

    public Integer getInputTokens() {
        return this.inputTokens;
    }

    public void setInputTokens(Integer inputTokens) {
        this.inputTokens = inputTokens;
    }

    public Integer getOutputTokens() {
        return this.outputTokens;
    }

    public void setOutputTokens(Integer outputTokens) {
        this.outputTokens = outputTokens;
    }
}
