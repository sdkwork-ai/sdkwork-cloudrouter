package com.sdkwork.clawrouter.app.model;


public class UsersSettingsUpdateResult {
    private String code;
    private UpdateSettingsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public UpdateSettingsResponse getData() {
        return this.data;
    }

    public void setData(UpdateSettingsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
