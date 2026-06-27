package com.sdkwork.clawrouter.app.model;


public class ArtifactsListResult {
    private String code;
    private RuntimeArtifactListResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RuntimeArtifactListResponse getData() {
        return this.data;
    }

    public void setData(RuntimeArtifactListResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
