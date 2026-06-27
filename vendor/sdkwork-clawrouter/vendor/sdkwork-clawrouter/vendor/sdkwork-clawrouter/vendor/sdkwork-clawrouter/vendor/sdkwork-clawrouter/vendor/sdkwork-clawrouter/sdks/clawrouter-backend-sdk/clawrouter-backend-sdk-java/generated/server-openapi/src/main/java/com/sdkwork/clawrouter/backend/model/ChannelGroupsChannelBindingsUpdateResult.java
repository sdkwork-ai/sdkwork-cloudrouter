package com.sdkwork.clawrouter.backend.model;


public class ChannelGroupsChannelBindingsUpdateResult {
    private String code;
    private AdminChannelGroupChannelBindingsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminChannelGroupChannelBindingsResponse getData() {
        return this.data;
    }

    public void setData(AdminChannelGroupChannelBindingsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
