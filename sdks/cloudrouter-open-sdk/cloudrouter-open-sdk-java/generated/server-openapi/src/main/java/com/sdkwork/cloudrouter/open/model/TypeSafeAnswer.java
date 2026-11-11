package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class TypeSafeAnswer {
    private String choice;
    private Double confidence;
    private Map<String, String> legend;
    private Double noul;
    private Map<String, Double> probabilities;
    private Double score;
    private String type;

    public String getChoice() {
        return this.choice;
    }

    public void setChoice(String choice) {
        this.choice = choice;
    }

    public Double getConfidence() {
        return this.confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public Map<String, String> getLegend() {
        return this.legend;
    }

    public void setLegend(Map<String, String> legend) {
        this.legend = legend;
    }

    public Double getNoul() {
        return this.noul;
    }

    public void setNoul(Double noul) {
        this.noul = noul;
    }

    public Map<String, Double> getProbabilities() {
        return this.probabilities;
    }

    public void setProbabilities(Map<String, Double> probabilities) {
        this.probabilities = probabilities;
    }

    public Double getScore() {
        return this.score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
