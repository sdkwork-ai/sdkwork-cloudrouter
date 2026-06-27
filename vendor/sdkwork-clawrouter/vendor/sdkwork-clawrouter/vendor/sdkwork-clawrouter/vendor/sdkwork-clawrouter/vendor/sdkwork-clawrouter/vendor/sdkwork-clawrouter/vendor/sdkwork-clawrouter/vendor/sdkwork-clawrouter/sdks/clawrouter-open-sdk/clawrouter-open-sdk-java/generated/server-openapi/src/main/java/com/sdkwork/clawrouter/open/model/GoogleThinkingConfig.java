package com.sdkwork.clawrouter.open.model;


public class GoogleThinkingConfig {
    private Boolean includeThoughts;
    private Integer thinkingBudget;

    public Boolean getIncludeThoughts() {
        return this.includeThoughts;
    }

    public void setIncludeThoughts(Boolean includeThoughts) {
        this.includeThoughts = includeThoughts;
    }

    public Integer getThinkingBudget() {
        return this.thinkingBudget;
    }

    public void setThinkingBudget(Integer thinkingBudget) {
        this.thinkingBudget = thinkingBudget;
    }
}
