package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiResponseCompactRequest {
    private String input;
    private Map<String, String> metadata;
    private String model;
    private String previousResponseId;

    public String getInput() {
        return this.input;
    }

    public void setInput(String input) {
        this.input = input;
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

    public String getPreviousResponseId() {
        return this.previousResponseId;
    }

    public void setPreviousResponseId(String previousResponseId) {
        this.previousResponseId = previousResponseId;
    }
}
