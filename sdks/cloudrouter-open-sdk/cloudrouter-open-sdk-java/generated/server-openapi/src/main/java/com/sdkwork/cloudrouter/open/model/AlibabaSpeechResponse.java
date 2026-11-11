package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class AlibabaSpeechResponse {
    private String code;
    private String message;
    private Map<String, String> output;
    private String requestId;
    private Map<String, String> usage;

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

    public Map<String, String> getOutput() {
        return this.output;
    }

    public void setOutput(Map<String, String> output) {
        this.output = output;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public Map<String, String> getUsage() {
        return this.usage;
    }

    public void setUsage(Map<String, String> usage) {
        this.usage = usage;
    }
}
