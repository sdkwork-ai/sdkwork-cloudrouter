package com.sdkwork.clawrouter.backend.model;


public class ChannelsVerifyResult {
    private String code;
    private AdminChannelTestResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminChannelTestResponse getData() {
        return this.data;
    }

    public void setData(AdminChannelTestResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
