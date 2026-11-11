package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiConversationItemCreateRequest {
    private List<Map<String, String>> items;

    public List<Map<String, String>> getItems() {
        return this.items;
    }

    public void setItems(List<Map<String, String>> items) {
        this.items = items;
    }
}
