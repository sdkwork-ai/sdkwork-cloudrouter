package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class MessagingRouteSimulationResponse {
    private Boolean matched;
    private String routeRuleId;
    private List<Map<String, String>> targets;

    public Boolean getMatched() {
        return this.matched;
    }

    public void setMatched(Boolean matched) {
        this.matched = matched;
    }

    public String getRouteRuleId() {
        return this.routeRuleId;
    }

    public void setRouteRuleId(String routeRuleId) {
        this.routeRuleId = routeRuleId;
    }

    public List<Map<String, String>> getTargets() {
        return this.targets;
    }

    public void setTargets(List<Map<String, String>> targets) {
        this.targets = targets;
    }
}
