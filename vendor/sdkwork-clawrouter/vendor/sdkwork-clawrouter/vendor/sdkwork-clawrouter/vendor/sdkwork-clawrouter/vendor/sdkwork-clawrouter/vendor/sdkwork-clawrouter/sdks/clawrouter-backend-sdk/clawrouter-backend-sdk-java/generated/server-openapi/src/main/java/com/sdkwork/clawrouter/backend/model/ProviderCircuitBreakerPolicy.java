package com.sdkwork.clawrouter.backend.model;


public class ProviderCircuitBreakerPolicy {
    private Integer failureThreshold;

    public Integer getFailureThreshold() {
        return this.failureThreshold;
    }

    public void setFailureThreshold(Integer failureThreshold) {
        this.failureThreshold = failureThreshold;
    }
}
