package com.sdkwork.clawrouter.app.model;


public class ConversationsListResult {
    private String code;
    private ChatConversationListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ChatConversationListResponse getData() {
        return this.data;
    }

    public void setData(ChatConversationListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
