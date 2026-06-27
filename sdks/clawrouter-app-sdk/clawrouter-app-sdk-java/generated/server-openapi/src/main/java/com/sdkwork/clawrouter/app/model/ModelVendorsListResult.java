package com.sdkwork.clawrouter.app.model;


public class ModelVendorsListResult {
    private String code;
    private RankingVendorOptionsResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RankingVendorOptionsResponse getData() {
        return this.data;
    }

    public void setData(RankingVendorOptionsResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
