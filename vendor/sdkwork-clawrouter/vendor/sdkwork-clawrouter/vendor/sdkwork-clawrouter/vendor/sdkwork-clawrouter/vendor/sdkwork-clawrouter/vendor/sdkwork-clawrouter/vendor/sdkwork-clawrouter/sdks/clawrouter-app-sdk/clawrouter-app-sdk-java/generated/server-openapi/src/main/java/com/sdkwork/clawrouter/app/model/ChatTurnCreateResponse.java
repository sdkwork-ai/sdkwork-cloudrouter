package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class ChatTurnCreateResponse {
    private List<ChatMessageItem> messages;
    private ChatTurnItem turn;

    public List<ChatMessageItem> getMessages() {
        return this.messages;
    }

    public void setMessages(List<ChatMessageItem> messages) {
        this.messages = messages;
    }

    public ChatTurnItem getTurn() {
        return this.turn;
    }

    public void setTurn(ChatTurnItem turn) {
        this.turn = turn;
    }
}
