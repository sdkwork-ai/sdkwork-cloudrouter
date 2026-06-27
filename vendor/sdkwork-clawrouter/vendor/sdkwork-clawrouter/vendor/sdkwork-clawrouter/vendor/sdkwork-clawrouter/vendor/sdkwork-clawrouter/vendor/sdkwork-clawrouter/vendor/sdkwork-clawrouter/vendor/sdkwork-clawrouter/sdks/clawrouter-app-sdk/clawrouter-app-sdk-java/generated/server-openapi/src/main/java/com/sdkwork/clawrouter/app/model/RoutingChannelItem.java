package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RoutingChannelItem {
    private String accessType;
    private String apiKey;
    private String balance;
    private String baseUrl;
    private List<String> capabilities;
    private RoutingCircuitBreakerPolicy circuitBreakerPolicy;
    private String errors;
    private String id;
    private Boolean isMultimodal;
    private String latency;
    private List<String> models;
    private String name;
    private String protocol;
    private String provider;
    private String providerCode;
    private RoutingRetryPolicy retryPolicy;
    private String rpm;
    private String status;
    private String timeoutMs;
    private String vendor;
    private String weight;

    public String getAccessType() {
        return this.accessType;
    }

    public void setAccessType(String accessType) {
        this.accessType = accessType;
    }

    public String getApiKey() {
        return this.apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getBalance() {
        return this.balance;
    }

    public void setBalance(String balance) {
        this.balance = balance;
    }

    public String getBaseUrl() {
        return this.baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public List<String> getCapabilities() {
        return this.capabilities;
    }

    public void setCapabilities(List<String> capabilities) {
        this.capabilities = capabilities;
    }

    public RoutingCircuitBreakerPolicy getCircuitBreakerPolicy() {
        return this.circuitBreakerPolicy;
    }

    public void setCircuitBreakerPolicy(RoutingCircuitBreakerPolicy circuitBreakerPolicy) {
        this.circuitBreakerPolicy = circuitBreakerPolicy;
    }

    public String getErrors() {
        return this.errors;
    }

    public void setErrors(String errors) {
        this.errors = errors;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Boolean getIsMultimodal() {
        return this.isMultimodal;
    }

    public void setIsMultimodal(Boolean isMultimodal) {
        this.isMultimodal = isMultimodal;
    }

    public String getLatency() {
        return this.latency;
    }

    public void setLatency(String latency) {
        this.latency = latency;
    }

    public List<String> getModels() {
        return this.models;
    }

    public void setModels(List<String> models) {
        this.models = models;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getProtocol() {
        return this.protocol;
    }

    public void setProtocol(String protocol) {
        this.protocol = protocol;
    }

    public String getProvider() {
        return this.provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderCode() {
        return this.providerCode;
    }

    public void setProviderCode(String providerCode) {
        this.providerCode = providerCode;
    }

    public RoutingRetryPolicy getRetryPolicy() {
        return this.retryPolicy;
    }

    public void setRetryPolicy(RoutingRetryPolicy retryPolicy) {
        this.retryPolicy = retryPolicy;
    }

    public String getRpm() {
        return this.rpm;
    }

    public void setRpm(String rpm) {
        this.rpm = rpm;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTimeoutMs() {
        return this.timeoutMs;
    }

    public void setTimeoutMs(String timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    public String getVendor() {
        return this.vendor;
    }

    public void setVendor(String vendor) {
        this.vendor = vendor;
    }

    public String getWeight() {
        return this.weight;
    }

    public void setWeight(String weight) {
        this.weight = weight;
    }
}
