package com.sdkwork.cloudrouter.open.model;


public class MiniMaxMusicGenerationRequest {
    private String model;
    private String prompt;
    private String lyrics;
    private Boolean stream;
    private String outputFormat;
    private Boolean isInstrumental;
    private Boolean lyricsOptimizer;
    private MiniMaxMusicAudioSetting audioSetting;

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getLyrics() {
        return this.lyrics;
    }

    public void setLyrics(String lyrics) {
        this.lyrics = lyrics;
    }

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }

    public String getOutputFormat() {
        return this.outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public Boolean getIsInstrumental() {
        return this.isInstrumental;
    }

    public void setIsInstrumental(Boolean isInstrumental) {
        this.isInstrumental = isInstrumental;
    }

    public Boolean getLyricsOptimizer() {
        return this.lyricsOptimizer;
    }

    public void setLyricsOptimizer(Boolean lyricsOptimizer) {
        this.lyricsOptimizer = lyricsOptimizer;
    }

    public MiniMaxMusicAudioSetting getAudioSetting() {
        return this.audioSetting;
    }

    public void setAudioSetting(MiniMaxMusicAudioSetting audioSetting) {
        this.audioSetting = audioSetting;
    }
}
