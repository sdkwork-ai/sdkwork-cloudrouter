package com.sdkwork.clawrouter.app.model;


public class RoutingCircuitBreakerPolicy {
    private String failureThreshold;

    public String getFailureThreshold() {
        return this.failureThreshold;
    }

    public void setFailureThreshold(String failureThreshold) {
        this.failureThreshold = failureThreshold;
    }
}
