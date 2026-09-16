package com.sdkwork.cloudrouter.open.model;


public class MiniMaxMusicAudioSetting {
    private Integer sampleRate;
    private Integer bitrate;
    private String format;

    public Integer getSampleRate() {
        return this.sampleRate;
    }

    public void setSampleRate(Integer sampleRate) {
        this.sampleRate = sampleRate;
    }

    public Integer getBitrate() {
        return this.bitrate;
    }

    public void setBitrate(Integer bitrate) {
        this.bitrate = bitrate;
    }

    public String getFormat() {
        return this.format;
    }

    public void setFormat(String format) {
        this.format = format;
    }
}
