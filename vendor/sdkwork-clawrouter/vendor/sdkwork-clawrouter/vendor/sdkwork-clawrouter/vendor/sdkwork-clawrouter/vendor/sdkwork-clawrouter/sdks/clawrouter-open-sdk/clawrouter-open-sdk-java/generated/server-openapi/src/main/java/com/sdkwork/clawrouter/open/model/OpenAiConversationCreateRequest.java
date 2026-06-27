package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiConversationCreateRequest {
    private List<OpenAiConversationItemCreateRequest> items;
    private Map<String, String> metadata;

    public List<OpenAiConversationItemCreateRequest> getItems() {
        return this.items;
    }

    public void setItems(List<OpenAiConversationItemCreateRequest> items) {
        this.items = items;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }
}
