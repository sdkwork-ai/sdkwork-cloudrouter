package com.sdkwork.clawrouter.app.model;


public class TurnResponsesCreateResult {
    private String code;
    private ChatTurnCreateResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ChatTurnCreateResponse getData() {
        return this.data;
    }

    public void setData(ChatTurnCreateResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
