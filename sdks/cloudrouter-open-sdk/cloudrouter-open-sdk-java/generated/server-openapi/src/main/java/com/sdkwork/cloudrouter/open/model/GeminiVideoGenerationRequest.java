package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class GeminiVideoGenerationRequest {
    private List<Map<String, String>> instances;
    private Map<String, String> parameters;

    public List<Map<String, String>> getInstances() {
        return this.instances;
    }

    public void setInstances(List<Map<String, String>> instances) {
        this.instances = instances;
    }

    public Map<String, String> getParameters() {
        return this.parameters;
    }

    public void setParameters(Map<String, String> parameters) {
        this.parameters = parameters;
    }
}
