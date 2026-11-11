package com.sdkwork.cloudrouter.open.model;


public class AlibabaVideoGenerationResponse {
    private String code;
    private String message;
    private AlibabaAsyncTask output;
    private String requestId;
    private AlibabaTaskUsage usage;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return this.message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

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
