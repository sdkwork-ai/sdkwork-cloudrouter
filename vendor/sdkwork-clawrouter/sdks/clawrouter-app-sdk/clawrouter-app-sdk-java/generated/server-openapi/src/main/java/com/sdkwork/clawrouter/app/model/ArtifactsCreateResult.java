package com.sdkwork.clawrouter.app.model;


public class ArtifactsCreateResult {
    private String code;
    private RuntimeArtifactResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RuntimeArtifactResponse getData() {
        return this.data;
    }

    public void setData(RuntimeArtifactResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
