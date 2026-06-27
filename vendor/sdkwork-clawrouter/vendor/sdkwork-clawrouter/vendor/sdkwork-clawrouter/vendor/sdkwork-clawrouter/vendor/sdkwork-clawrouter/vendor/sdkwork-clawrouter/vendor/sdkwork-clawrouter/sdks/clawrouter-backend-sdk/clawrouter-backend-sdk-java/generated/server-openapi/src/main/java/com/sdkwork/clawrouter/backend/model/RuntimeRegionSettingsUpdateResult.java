package com.sdkwork.clawrouter.backend.model;


public class RuntimeRegionSettingsUpdateResult {
    private String code;
    private AdminRuntimeRegionSettingsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminRuntimeRegionSettingsResponse getData() {
        return this.data;
    }

    public void setData(AdminRuntimeRegionSettingsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
