package com.sdkwork.clawrouter.app.model;

import java.util.Map;

public class ChatTurnResponseRequest {
    private String message;
    private Map<String, String> metadata;
    private String model;
    private String provider;
    private String runtime;
    private String runtimeInvocationId;
    private String status;
    private Map<String, Object> usage;
    private String usageFactId;

    public String getMessage() {
        return this.message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getProvider() {
        return this.provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getRuntime() {
        return this.runtime;
    }

    public void setRuntime(String runtime) {
        this.runtime = runtime;
    }

    public String getRuntimeInvocationId() {
        return this.runtimeInvocationId;
    }

    public void setRuntimeInvocationId(String runtimeInvocationId) {
        this.runtimeInvocationId = runtimeInvocationId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Map<String, Object> getUsage() {
        return this.usage;
    }

    public void setUsage(Map<String, Object> usage) {
        this.usage = usage;
    }

    public String getUsageFactId() {
        return this.usageFactId;
    }

    public void setUsageFactId(String usageFactId) {
        this.usageFactId = usageFactId;
    }
}
