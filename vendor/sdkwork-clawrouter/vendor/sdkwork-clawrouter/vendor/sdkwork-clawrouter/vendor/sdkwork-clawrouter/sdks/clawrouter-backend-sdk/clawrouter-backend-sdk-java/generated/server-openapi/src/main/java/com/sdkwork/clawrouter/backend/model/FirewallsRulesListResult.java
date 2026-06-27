package com.sdkwork.clawrouter.backend.model;


public class FirewallsRulesListResult {
    private String code;
    private AdminFirewallRulesResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminFirewallRulesResponse getData() {
        return this.data;
    }

    public void setData(AdminFirewallRulesResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
