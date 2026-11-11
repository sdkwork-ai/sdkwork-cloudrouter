package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class AlibabaSpeechRequest {
    private AlibabaSpeechInput input;
    private String model;
    private Map<String, String> parameters;

    public AlibabaSpeechInput getInput() {
        return this.input;
    }

    public void setInput(AlibabaSpeechInput input) {
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
