package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiAudioTranslation {
    private Double duration;
    private List<String> segments;
    private String text;

    public Double getDuration() {
        return this.duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
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
}
