package com.sdkwork.cloudrouter.open.model;


public class MiniMaxMusicData {
    private String audio;
    private MiniMaxMusicExtraInfo extraInfo;
    private Integer status;

    public String getAudio() {
        return this.audio;
    }

    public void setAudio(String audio) {
        this.audio = audio;
    }

    public MiniMaxMusicExtraInfo getExtraInfo() {
        return this.extraInfo;
    }

    public void setExtraInfo(MiniMaxMusicExtraInfo extraInfo) {
        this.extraInfo = extraInfo;
    }

    public Integer getStatus() {
        return this.status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }
}
