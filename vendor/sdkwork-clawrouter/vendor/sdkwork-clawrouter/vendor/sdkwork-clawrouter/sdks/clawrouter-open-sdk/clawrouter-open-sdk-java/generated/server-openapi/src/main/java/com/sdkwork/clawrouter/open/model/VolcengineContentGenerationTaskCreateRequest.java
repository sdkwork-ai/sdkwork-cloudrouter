package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class VolcengineContentGenerationTaskCreateRequest {
    private String callbackUrl;
    private List<VolcengineContentPart> content;
    private Map<String, String> metadata;
    private String model;

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public List<VolcengineContentPart> getContent() {
        return this.content;
    }

    public void setContent(List<VolcengineContentPart> content) {
        this.content = content;
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
}
