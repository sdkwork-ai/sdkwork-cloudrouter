package com.sdkwork.cloudrouter.open.model;


public class ElevenLabsAudioEffects {
    private String backgroundNoiseId;
    private Double distance;
    private String environmentId;
    private String filterPresetId;
    private Double pan;
    private Double sendLevel;

    public String getBackgroundNoiseId() {
        return this.backgroundNoiseId;
    }

    public void setBackgroundNoiseId(String backgroundNoiseId) {
        this.backgroundNoiseId = backgroundNoiseId;
    }

    public Double getDistance() {
        return this.distance;
    }

    public void setDistance(Double distance) {
        this.distance = distance;
    }

    public String getEnvironmentId() {
        return this.environmentId;
    }

    public void setEnvironmentId(String environmentId) {
        this.environmentId = environmentId;
    }

    public String getFilterPresetId() {
        return this.filterPresetId;
    }

    public void setFilterPresetId(String filterPresetId) {
        this.filterPresetId = filterPresetId;
    }

    public Double getPan() {
        return this.pan;
    }

    public void setPan(Double pan) {
        this.pan = pan;
    }

    public Double getSendLevel() {
        return this.sendLevel;
    }

    public void setSendLevel(Double sendLevel) {
        this.sendLevel = sendLevel;
    }
}
