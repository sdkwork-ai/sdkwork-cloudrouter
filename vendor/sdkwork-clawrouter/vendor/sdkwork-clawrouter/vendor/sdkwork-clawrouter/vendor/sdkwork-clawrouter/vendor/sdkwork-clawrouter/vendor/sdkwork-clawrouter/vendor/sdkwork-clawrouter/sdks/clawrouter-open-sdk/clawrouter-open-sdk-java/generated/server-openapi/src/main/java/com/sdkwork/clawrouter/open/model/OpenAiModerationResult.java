package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiModerationResult {
    private Map<String, String> categories;
    private Map<String, Double> categoryScores;
    private Boolean flagged;

    public Map<String, String> getCategories() {
        return this.categories;
    }

    public void setCategories(Map<String, String> categories) {
        this.categories = categories;
    }

    public Map<String, Double> getCategoryScores() {
        return this.categoryScores;
    }

    public void setCategoryScores(Map<String, Double> categoryScores) {
        this.categoryScores = categoryScores;
    }

    public Boolean getFlagged() {
        return this.flagged;
    }

    public void setFlagged(Boolean flagged) {
        this.flagged = flagged;
    }
}
