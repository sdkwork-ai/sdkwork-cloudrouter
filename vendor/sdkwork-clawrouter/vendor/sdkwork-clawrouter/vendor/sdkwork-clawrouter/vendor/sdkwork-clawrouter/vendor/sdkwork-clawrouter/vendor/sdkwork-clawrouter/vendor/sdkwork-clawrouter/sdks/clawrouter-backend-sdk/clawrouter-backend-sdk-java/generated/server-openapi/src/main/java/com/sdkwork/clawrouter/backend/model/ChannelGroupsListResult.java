package com.sdkwork.clawrouter.backend.model;


public class ChannelGroupsListResult {
    private String code;
    private AdminChannelGroupsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminChannelGroupsResponse getData() {
        return this.data;
    }

    public void setData(AdminChannelGroupsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
