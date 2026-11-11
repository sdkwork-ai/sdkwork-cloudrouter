package com.sdkwork.cloudrouter.open.model;


public class AlibabaVideoGenerationTask {
    private AlibabaAsyncTask output;
    private String requestId;
    private AlibabaTaskUsage usage;

    public AlibabaAsyncTask getOutput() {
        return this.output;
    }

    public void setOutput(AlibabaAsyncTask output) {
        this.output = output;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public AlibabaTaskUsage getUsage() {
        return this.usage;
    }

    public void setUsage(AlibabaTaskUsage usage) {
        this.usage = usage;
    }
}
