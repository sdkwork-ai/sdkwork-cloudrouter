package com.sdkwork.clawrouter.backend.model;


public class InstallationStatusRetrieveResult {
    private String code;
    private InstallationStatusResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public InstallationStatusResponse getData() {
        return this.data;
    }

    public void setData(InstallationStatusResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
