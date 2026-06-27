package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class ProviderRetryPolicy {
    private Integer backoffMs;
    private Integer maxAttempts;
    private List<Integer> retryableStatusCodes;

    public Integer getBackoffMs() {
        return this.backoffMs;
    }

    public void setBackoffMs(Integer backoffMs) {
        this.backoffMs = backoffMs;
    }

    public Integer getMaxAttempts() {
        return this.maxAttempts;
    }

    public void setMaxAttempts(Integer maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public List<Integer> getRetryableStatusCodes() {
        return this.retryableStatusCodes;
    }

    public void setRetryableStatusCodes(List<Integer> retryableStatusCodes) {
        this.retryableStatusCodes = retryableStatusCodes;
    }
}
