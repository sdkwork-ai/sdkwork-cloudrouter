package com.sdkwork.cloudrouter.open.model;


public class ElevenLabsVoiceSettings {
    private Double cloneStrength;
    private Double similarityBoost;
    private Double speed;
    private Double stability;
    private Double style;
    private Boolean useSpeakerBoost;

    public Double getCloneStrength() {
        return this.cloneStrength;
    }

    public void setCloneStrength(Double cloneStrength) {
        this.cloneStrength = cloneStrength;
    }

    public Double getSimilarityBoost() {
        return this.similarityBoost;
    }

    public void setSimilarityBoost(Double similarityBoost) {
        this.similarityBoost = similarityBoost;
    }

    public Double getSpeed() {
        return this.speed;
    }

    public void setSpeed(Double speed) {
        this.speed = speed;
    }

    public Double getStability() {
        return this.stability;
    }

    public void setStability(Double stability) {
        this.stability = stability;
    }

    public Double getStyle() {
        return this.style;
    }

    public void setStyle(Double style) {
        this.style = style;
    }

    public Boolean getUseSpeakerBoost() {
        return this.useSpeakerBoost;
    }

    public void setUseSpeakerBoost(Boolean useSpeakerBoost) {
        this.useSpeakerBoost = useSpeakerBoost;
    }
}
