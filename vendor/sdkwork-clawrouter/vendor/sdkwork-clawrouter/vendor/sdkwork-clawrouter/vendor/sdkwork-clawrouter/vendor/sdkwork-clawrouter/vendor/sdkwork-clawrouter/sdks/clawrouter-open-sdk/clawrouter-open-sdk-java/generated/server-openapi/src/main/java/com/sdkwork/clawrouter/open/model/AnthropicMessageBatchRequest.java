package com.sdkwork.clawrouter.open.model;


public class AnthropicMessageBatchRequest {
    private String customId;
    private AnthropicMessageCreateRequest params;

    public String getCustomId() {
        return this.customId;
    }

    public void setCustomId(String customId) {
        this.customId = customId;
    }

    public AnthropicMessageCreateRequest getParams() {
        return this.params;
    }

    public void setParams(AnthropicMessageCreateRequest params) {
        this.params = params;
    }
}
