package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class AlibabaImageGenerationRequest {
    private Map<String, String> input;
    private String model;
    private Map<String, String> parameters;

    public Map<String, String> getInput() {
        return this.input;
    }

    public void setInput(Map<String, String> input) {
        this.input = input;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Map<String, String> getParameters() {
        return this.parameters;
    }

    public void setParameters(Map<String, String> parameters) {
        this.parameters = parameters;
    }
}
