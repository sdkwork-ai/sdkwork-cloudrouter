package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiModeration {
    private String id;
    private String model;
    private List<OpenAiModerationResult> results;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public List<OpenAiModerationResult> getResults() {
        return this.results;
    }

    public void setResults(List<OpenAiModerationResult> results) {
        this.results = results;
    }
}
