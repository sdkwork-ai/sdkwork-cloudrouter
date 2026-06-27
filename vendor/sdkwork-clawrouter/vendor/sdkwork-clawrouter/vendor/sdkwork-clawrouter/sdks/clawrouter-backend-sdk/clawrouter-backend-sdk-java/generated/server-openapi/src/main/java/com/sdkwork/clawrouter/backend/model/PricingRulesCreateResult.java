package com.sdkwork.clawrouter.backend.model;


public class PricingRulesCreateResult {
    private String code;
    private ServiceProviderPricingRuleMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ServiceProviderPricingRuleMutationResponse getData() {
        return this.data;
    }

    public void setData(ServiceProviderPricingRuleMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
