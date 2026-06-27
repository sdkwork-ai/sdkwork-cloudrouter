package com.sdkwork.clawrouter.backend.model;


public class ChannelGroupsCreateResult {
    private String code;
    private AdminChannelGroupMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminChannelGroupMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminChannelGroupMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
