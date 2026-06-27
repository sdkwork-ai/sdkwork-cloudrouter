package com.sdkwork.clawrouter.app.model;


public class ConversationMessagesListResult {
    private String code;
    private ChatMessageListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ChatMessageListResponse getData() {
        return this.data;
    }

    public void setData(ChatMessageListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
