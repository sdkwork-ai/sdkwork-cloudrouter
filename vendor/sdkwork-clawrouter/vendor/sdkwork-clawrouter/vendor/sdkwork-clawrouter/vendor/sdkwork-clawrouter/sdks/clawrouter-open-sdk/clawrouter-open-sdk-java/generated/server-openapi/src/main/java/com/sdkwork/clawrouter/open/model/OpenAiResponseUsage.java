package com.sdkwork.clawrouter.open.model;


public class OpenAiResponseUsage {
    private Integer inputTokens;
    private OpenAiResponseInputTokensDetails inputTokensDetails;
    private Integer outputTokens;
    private OpenAiResponseOutputTokensDetails outputTokensDetails;
    private Integer totalTokens;

    public Integer getInputTokens() {
        return this.inputTokens;
    }

    public void setInputTokens(Integer inputTokens) {
        this.inputTokens = inputTokens;
    }

    public OpenAiResponseInputTokensDetails getInputTokensDetails() {
        return this.inputTokensDetails;
    }

    public void setInputTokensDetails(OpenAiResponseInputTokensDetails inputTokensDetails) {
        this.inputTokensDetails = inputTokensDetails;
    }

    public Integer getOutputTokens() {
        return this.outputTokens;
    }

    public void setOutputTokens(Integer outputTokens) {
        this.outputTokens = outputTokens;
    }

    public OpenAiResponseOutputTokensDetails getOutputTokensDetails() {
        return this.outputTokensDetails;
    }

    public void setOutputTokensDetails(OpenAiResponseOutputTokensDetails outputTokensDetails) {
        this.outputTokensDetails = outputTokensDetails;
    }

    public Integer getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(Integer totalTokens) {
        this.totalTokens = totalTokens;
    }
}
