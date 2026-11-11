package com.sdkwork.cloudrouter.open.model;


public class BytedanceTtsAudioParams {
    private String format;
    private Integer loudnessRate;
    private Integer sampleRate;
    private Integer speechRate;

    public String getFormat() {
        return this.format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public Integer getLoudnessRate() {
        return this.loudnessRate;
    }

    public void setLoudnessRate(Integer loudnessRate) {
        this.loudnessRate = loudnessRate;
    }

    public Integer getSampleRate() {
        return this.sampleRate;
    }

    public void setSampleRate(Integer sampleRate) {
        this.sampleRate = sampleRate;
    }

    public Integer getSpeechRate() {
        return this.speechRate;
    }

    public void setSpeechRate(Integer speechRate) {
        this.speechRate = speechRate;
    }
}
