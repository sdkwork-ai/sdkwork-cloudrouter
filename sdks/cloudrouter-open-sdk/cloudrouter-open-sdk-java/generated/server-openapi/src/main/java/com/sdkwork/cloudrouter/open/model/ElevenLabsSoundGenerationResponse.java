package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class ElevenLabsSoundGenerationResponse {
    private Map<String, Object> audio;
    private String audioUrl;
    private String id;
    private String status;
    private String url;

    public Map<String, Object> getAudio() {
        return this.audio;
    }

    public void setAudio(Map<String, Object> audio) {
        this.audio = audio;
    }

    public String getAudioUrl() {
        return this.audioUrl;
    }

    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
