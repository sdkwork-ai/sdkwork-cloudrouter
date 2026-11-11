package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class RunwayTaskAccepted {
    private Map<String, String> estimatedCost;
    private String id;

    public Map<String, String> getEstimatedCost() {
        return this.estimatedCost;
    }

    public void setEstimatedCost(Map<String, String> estimatedCost) {
        this.estimatedCost = estimatedCost;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }
}
