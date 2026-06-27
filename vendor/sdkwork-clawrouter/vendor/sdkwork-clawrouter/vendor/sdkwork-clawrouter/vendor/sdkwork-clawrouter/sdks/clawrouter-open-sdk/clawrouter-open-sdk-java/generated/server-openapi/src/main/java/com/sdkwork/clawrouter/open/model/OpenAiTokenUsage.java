package com.sdkwork.clawrouter.open.model;


public class OpenAiTokenUsage {
    private Integer completionTokens;
    private OpenAiCompletionTokensDetails completionTokensDetails;
    private Integer promptTokens;
    private OpenAiPromptTokensDetails promptTokensDetails;
    private Integer totalTokens;

    public Integer getCompletionTokens() {
        return this.completionTokens;
    }

    public void setCompletionTokens(Integer completionTokens) {
        this.completionTokens = completionTokens;
    }

    public OpenAiCompletionTokensDetails getCompletionTokensDetails() {
        return this.completionTokensDetails;
    }

    public void setCompletionTokensDetails(OpenAiCompletionTokensDetails completionTokensDetails) {
        this.completionTokensDetails = completionTokensDetails;
    }

    public Integer getPromptTokens() {
        return this.promptTokens;
    }

    public void setPromptTokens(Integer promptTokens) {
        this.promptTokens = promptTokens;
    }

    public OpenAiPromptTokensDetails getPromptTokensDetails() {
        return this.promptTokensDetails;
    }

    public void setPromptTokensDetails(OpenAiPromptTokensDetails promptTokensDetails) {
        this.promptTokensDetails = promptTokensDetails;
    }

    public Integer getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(Integer totalTokens) {
        this.totalTokens = totalTokens;
    }
}
