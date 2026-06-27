package com.sdkwork.clawrouter.backend.model;


public class AdminFirewallRuleCreateRequest {
    private String reason;
    private String type;
    private String value;

    public String getReason() {
        return this.reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getValue() {
        return this.value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
