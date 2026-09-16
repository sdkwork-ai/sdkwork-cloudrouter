package com.sdkwork.cloudrouter.open.model;


public class MiniMaxMusicExtraInfo {
    private Double musicDuration;
    private Integer musicSampleRate;
    private Integer musicChannel;
    private Integer bitrate;
    private Integer musicSize;

    public Double getMusicDuration() {
        return this.musicDuration;
    }

    public void setMusicDuration(Double musicDuration) {
        this.musicDuration = musicDuration;
    }

    public Integer getMusicSampleRate() {
        return this.musicSampleRate;
    }

    public void setMusicSampleRate(Integer musicSampleRate) {
        this.musicSampleRate = musicSampleRate;
    }

    public Integer getMusicChannel() {
        return this.musicChannel;
    }

    public void setMusicChannel(Integer musicChannel) {
        this.musicChannel = musicChannel;
    }

    public Integer getBitrate() {
        return this.bitrate;
    }

    public void setBitrate(Integer bitrate) {
        this.bitrate = bitrate;
    }

    public Integer getMusicSize() {
        return this.musicSize;
    }

    public void setMusicSize(Integer musicSize) {
        this.musicSize = musicSize;
    }
}
