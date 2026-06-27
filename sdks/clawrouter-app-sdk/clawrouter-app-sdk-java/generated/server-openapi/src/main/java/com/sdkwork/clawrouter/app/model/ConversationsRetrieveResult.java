package com.sdkwork.clawrouter.app.model;


public class ConversationsRetrieveResult {
    private String code;
    private ChatConversationItem data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ChatConversationItem getData() {
        return this.data;
    }

    public void setData(ChatConversationItem data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
