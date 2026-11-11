package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class XaiDeferredImageResponse {
    private List<XaiGeneratedImage> data;
    private Map<String, String> error;
    private String requestId;
    private String status;
    private XaiUsage usage;

    public List<XaiGeneratedImage> getData() {
        return this.data;
    }

    public void setData(List<XaiGeneratedImage> data) {
        this.data = data;
    }

    public Map<String, String> getError() {
        return this.error;
    }

    public void setError(Map<String, String> error) {
        this.error = error;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public XaiUsage getUsage() {
        return this.usage;
    }

    public void setUsage(XaiUsage usage) {
        this.usage = usage;
    }
}
