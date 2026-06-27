package com.sdkwork.clawrouter.app.model;


public class ModelRankingsListResult {
    private String code;
    private ModelRankingsSnapshot data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ModelRankingsSnapshot getData() {
        return this.data;
    }

    public void setData(ModelRankingsSnapshot data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
