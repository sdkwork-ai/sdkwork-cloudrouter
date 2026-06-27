package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiBatchCreateRequest {
    private String completionWindow;
    private String endpoint;
    private String inputFileId;
    private Map<String, String> metadata;

    public String getCompletionWindow() {
        return this.completionWindow;
    }

    public void setCompletionWindow(String completionWindow) {
        this.completionWindow = completionWindow;
    }

    public String getEndpoint() {
        return this.endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getInputFileId() {
        return this.inputFileId;
    }

    public void setInputFileId(String inputFileId) {
        this.inputFileId = inputFileId;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }
}
