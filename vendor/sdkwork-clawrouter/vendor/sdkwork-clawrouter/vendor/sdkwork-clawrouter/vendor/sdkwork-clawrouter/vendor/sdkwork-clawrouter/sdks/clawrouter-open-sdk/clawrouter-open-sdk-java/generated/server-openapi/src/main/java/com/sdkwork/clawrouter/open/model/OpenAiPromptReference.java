package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiPromptReference {
    private String id;
    private Map<String, String> variables;
    private String version;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getVariables() {
        return this.variables;
    }

    public void setVariables(Map<String, String> variables) {
        this.variables = variables;
    }

    public String getVersion() {
        return this.version;
    }

    public void setVersion(String version) {
        this.version = version;
    }
}
