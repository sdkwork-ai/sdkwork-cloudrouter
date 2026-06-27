package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class ChatMessageListResponse {
    private List<ChatMessageItem> items;

    public List<ChatMessageItem> getItems() {
        return this.items;
    }

    public void setItems(List<ChatMessageItem> items) {
        this.items = items;
    }
}
