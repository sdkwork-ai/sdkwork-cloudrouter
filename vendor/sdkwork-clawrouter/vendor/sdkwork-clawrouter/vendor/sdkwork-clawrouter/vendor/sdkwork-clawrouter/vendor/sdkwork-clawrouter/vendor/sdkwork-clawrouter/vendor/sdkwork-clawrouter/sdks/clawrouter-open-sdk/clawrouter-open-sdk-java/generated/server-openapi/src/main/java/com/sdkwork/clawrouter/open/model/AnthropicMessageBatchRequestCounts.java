package com.sdkwork.clawrouter.open.model;


public class AnthropicMessageBatchRequestCounts {
    private Integer canceled;
    private Integer errored;
    private Integer expired;
    private Integer processing;
    private Integer succeeded;

    public Integer getCanceled() {
        return this.canceled;
    }

    public void setCanceled(Integer canceled) {
        this.canceled = canceled;
    }

    public Integer getErrored() {
        return this.errored;
    }

    public void setErrored(Integer errored) {
        this.errored = errored;
    }

    public Integer getExpired() {
        return this.expired;
    }

    public void setExpired(Integer expired) {
        this.expired = expired;
    }

    public Integer getProcessing() {
        return this.processing;
    }

    public void setProcessing(Integer processing) {
        this.processing = processing;
    }

    public Integer getSucceeded() {
        return this.succeeded;
    }

    public void setSucceeded(Integer succeeded) {
        this.succeeded = succeeded;
    }
}
