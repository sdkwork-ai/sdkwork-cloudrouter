package com.sdkwork.clawrouter.open.model;


public class OpenAiEmbeddingUsage {
    private Integer promptTokens;
    private Integer totalTokens;

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
