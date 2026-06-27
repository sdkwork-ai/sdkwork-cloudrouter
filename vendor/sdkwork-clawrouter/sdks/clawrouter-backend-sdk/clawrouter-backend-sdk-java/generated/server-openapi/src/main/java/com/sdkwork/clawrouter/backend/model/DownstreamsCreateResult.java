package com.sdkwork.clawrouter.backend.model;


public class DownstreamsCreateResult {
    private String code;
    private ServiceProviderDownstreamMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ServiceProviderDownstreamMutationResponse getData() {
        return this.data;
    }

    public void setData(ServiceProviderDownstreamMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
