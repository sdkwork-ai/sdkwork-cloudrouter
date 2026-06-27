package com.sdkwork.clawrouter.backend.model;

import java.util.Map;

public class AdminPromptRenderRequest {
    private Map<String, String> variables;

    public Map<String, String> getVariables() {
        return this.variables;
    }

    public void setVariables(Map<String, String> variables) {
        this.variables = variables;
    }
}
