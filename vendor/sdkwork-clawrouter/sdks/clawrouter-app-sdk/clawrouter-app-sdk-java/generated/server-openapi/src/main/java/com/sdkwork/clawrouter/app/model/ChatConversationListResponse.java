package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class ChatConversationListResponse {
    private List<ChatConversationItem> items;

    public List<ChatConversationItem> getItems() {
        return this.items;
    }

    public void setItems(List<ChatConversationItem> items) {
        this.items = items;
    }
}
