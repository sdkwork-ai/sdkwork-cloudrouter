package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class AdminMcpServerRevisionCreateRequest {
    private List<String> argsJson;
    private String authType;
    private String command;
    private String endpointUrl;
    private Map<String, String> envSchema;
    private Map<String, String> retryPolicy;
    private String revisionNo;
    private String secretRef;
    private Integer timeoutMs;
    private String transport;

    public List<String> getArgsJson() {
        return this.argsJson;
    }

    public void setArgsJson(List<String> argsJson) {
        this.argsJson = argsJson;
    }

    public String getAuthType() {
        return this.authType;
    }

    public void setAuthType(String authType) {
        this.authType = authType;
    }

    public String getCommand() {
        return this.command;
    }

    public void setCommand(String command) {
        this.command = command;
    }

    public String getEndpointUrl() {
        return this.endpointUrl;
    }

    public void setEndpointUrl(String endpointUrl) {
        this.endpointUrl = endpointUrl;
    }

    public Map<String, String> getEnvSchema() {
        return this.envSchema;
    }

    public void setEnvSchema(Map<String, String> envSchema) {
        this.envSchema = envSchema;
    }

    public Map<String, String> getRetryPolicy() {
        return this.retryPolicy;
    }

    public void setRetryPolicy(Map<String, String> retryPolicy) {
        this.retryPolicy = retryPolicy;
    }

    public String getRevisionNo() {
        return this.revisionNo;
    }

    public void setRevisionNo(String revisionNo) {
        this.revisionNo = revisionNo;
    }

    public String getSecretRef() {
        return this.secretRef;
    }

    public void setSecretRef(String secretRef) {
        this.secretRef = secretRef;
    }

    public Integer getTimeoutMs() {
        return this.timeoutMs;
    }

    public void setTimeoutMs(Integer timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    public String getTransport() {
        return this.transport;
    }

    public void setTransport(String transport) {
        this.transport = transport;
    }
}
