package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class GeminiImageGenerationResponse {
    private Map<String, String> error;
    private List<Map<String, String>> predictions;

    public Map<String, String> getError() {
        return this.error;
    }

    public void setError(Map<String, String> error) {
        this.error = error;
    }

    public List<Map<String, String>> getPredictions() {
        return this.predictions;
    }

    public void setPredictions(List<Map<String, String>> predictions) {
        this.predictions = predictions;
    }
}
