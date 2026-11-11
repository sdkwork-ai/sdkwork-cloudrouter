package com.sdkwork.cloudrouter.open.model;


public class MiniMaxMusicGenerationRequest {
    private String audioBase64;
    private MiniMaxMusicAudioSetting audioSetting;
    private String audioUrl;
    private String coverFeatureId;
    private Boolean isInstrumental;
    private String lyrics;
    private Boolean lyricsOptimizer;
    private String model;
    private String outputFormat;
    private String prompt;
    private Boolean stream;

    public String getAudioBase64() {
        return this.audioBase64;
    }

    public void setAudioBase64(String audioBase64) {
        this.audioBase64 = audioBase64;
    }

    public MiniMaxMusicAudioSetting getAudioSetting() {
        return this.audioSetting;
    }

    public void setAudioSetting(MiniMaxMusicAudioSetting audioSetting) {
        this.audioSetting = audioSetting;
    }

    public String getAudioUrl() {
        return this.audioUrl;
    }

    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }

    public String getCoverFeatureId() {
        return this.coverFeatureId;
    }

    public void setCoverFeatureId(String coverFeatureId) {
        this.coverFeatureId = coverFeatureId;
    }

    public Boolean getIsInstrumental() {
        return this.isInstrumental;
    }

    public void setIsInstrumental(Boolean isInstrumental) {
        this.isInstrumental = isInstrumental;
    }

    public String getLyrics() {
        return this.lyrics;
    }

    public void setLyrics(String lyrics) {
        this.lyrics = lyrics;
    }

    public Boolean getLyricsOptimizer() {
        return this.lyricsOptimizer;
    }

    public void setLyricsOptimizer(Boolean lyricsOptimizer) {
        this.lyricsOptimizer = lyricsOptimizer;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getOutputFormat() {
        return this.outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }
}
