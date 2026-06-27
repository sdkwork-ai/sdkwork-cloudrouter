package com.sdkwork.clawrouter.open.model;


public class OpenAiResponseInputTokenCount {
    private Integer inputTokens;
    private OpenAiResponseInputTokensDetails inputTokensDetails;
    private String model;
    private String object;

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
