package com.sdkwork.clawrouter.backend.model;

import java.util.Map;

public class MessagingProviderAccountCreateRequest {
    private String accountCode;
    private String accountName;
    private String baseUrl;
    private Map<String, String> capabilitySchema;
    private String channel;
    private Map<String, Object> credential;
    private String deliveryPurpose;
    private String providerCode;

    public String getAccountCode() {
        return this.accountCode;
    }

    public void setAccountCode(String accountCode) {
        this.accountCode = accountCode;
    }

    public String getAccountName() {
        return this.accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public String getBaseUrl() {
        return this.baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Map<String, String> getCapabilitySchema() {
        return this.capabilitySchema;
    }

    public void setCapabilitySchema(Map<String, String> capabilitySchema) {
        this.capabilitySchema = capabilitySchema;
    }

    public String getChannel() {
        return this.channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public Map<String, Object> getCredential() {
        return this.credential;
    }

    public void setCredential(Map<String, Object> credential) {
        this.credential = credential;
    }

    public String getDeliveryPurpose() {
        return this.deliveryPurpose;
    }

    public void setDeliveryPurpose(String deliveryPurpose) {
        this.deliveryPurpose = deliveryPurpose;
    }

    public String getProviderCode() {
        return this.providerCode;
    }

    public void setProviderCode(String providerCode) {
        this.providerCode = providerCode;
    }
}
