package com.sdkwork.clawrouter.backend.model;


public class PriceSimulationCreateResult {
    private String code;
    private ServiceProviderPriceSimulationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ServiceProviderPriceSimulationResponse getData() {
        return this.data;
    }

    public void setData(ServiceProviderPriceSimulationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
