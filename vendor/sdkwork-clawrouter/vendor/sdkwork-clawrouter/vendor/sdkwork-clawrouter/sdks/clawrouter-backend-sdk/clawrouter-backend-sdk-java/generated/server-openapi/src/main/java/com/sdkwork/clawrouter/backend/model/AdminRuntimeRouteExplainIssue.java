package com.sdkwork.clawrouter.backend.model;


public class AdminRuntimeRouteExplainIssue {
    private String code;
    private String message;
    private String severity;

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

    public String getSeverity() {
        return this.severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }
}
