package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminChannelGroupRouteExplainIssue {
    private String code;
    private List<String> details;
    private String severity;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public List<String> getDetails() {
        return this.details;
    }

    public void setDetails(List<String> details) {
        this.details = details;
    }

    public String getSeverity() {
        return this.severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }
}
