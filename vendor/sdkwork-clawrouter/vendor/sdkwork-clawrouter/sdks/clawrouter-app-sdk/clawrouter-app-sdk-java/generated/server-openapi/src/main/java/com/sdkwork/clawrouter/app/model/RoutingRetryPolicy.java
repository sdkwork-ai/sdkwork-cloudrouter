package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RoutingRetryPolicy {
    private String backoffMs;
    private String maxAttempts;
    private List<String> retryableStatusCodes;

    public String getBackoffMs() {
        return this.backoffMs;
    }

    public void setBackoffMs(String backoffMs) {
        this.backoffMs = backoffMs;
    }

    public String getMaxAttempts() {
        return this.maxAttempts;
    }

    public void setMaxAttempts(String maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public List<String> getRetryableStatusCodes() {
        return this.retryableStatusCodes;
    }

    public void setRetryableStatusCodes(List<String> retryableStatusCodes) {
        this.retryableStatusCodes = retryableStatusCodes;
    }
}
