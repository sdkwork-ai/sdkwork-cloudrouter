package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiAudioTranscription {
    private Double duration;
    private String language;
    private List<String> segments;
    private String text;
    private List<String> words;

    public Double getDuration() {
        return this.duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public String getLanguage() {
        return this.language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public List<String> getSegments() {
        return this.segments;
    }

    public void setSegments(List<String> segments) {
        this.segments = segments;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public List<String> getWords() {
        return this.words;
    }

    public void setWords(List<String> words) {
        this.words = words;
    }
}
