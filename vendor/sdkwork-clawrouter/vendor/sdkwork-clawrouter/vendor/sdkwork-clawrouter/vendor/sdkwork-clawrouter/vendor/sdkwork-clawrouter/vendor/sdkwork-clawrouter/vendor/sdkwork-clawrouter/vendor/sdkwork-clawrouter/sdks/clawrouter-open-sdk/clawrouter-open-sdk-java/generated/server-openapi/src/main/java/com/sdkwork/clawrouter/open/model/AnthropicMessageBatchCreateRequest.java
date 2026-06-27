package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class AnthropicMessageBatchCreateRequest {
    private List<AnthropicMessageBatchRequest> requests;

    public List<AnthropicMessageBatchRequest> getRequests() {
        return this.requests;
    }

    public void setRequests(List<AnthropicMessageBatchRequest> requests) {
        this.requests = requests;
    }
}
