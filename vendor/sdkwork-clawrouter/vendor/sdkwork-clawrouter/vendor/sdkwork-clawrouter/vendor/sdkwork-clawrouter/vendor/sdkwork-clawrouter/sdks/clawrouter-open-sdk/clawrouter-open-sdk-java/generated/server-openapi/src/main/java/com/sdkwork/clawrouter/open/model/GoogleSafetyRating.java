package com.sdkwork.clawrouter.open.model;


public class GoogleSafetyRating {
    private Boolean blocked;
    private String category;
    private String probability;

    public Boolean getBlocked() {
        return this.blocked;
    }

    public void setBlocked(Boolean blocked) {
        this.blocked = blocked;
    }

    public String getCategory() {
        return this.category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getProbability() {
        return this.probability;
    }

    public void setProbability(String probability) {
        this.probability = probability;
    }
}
