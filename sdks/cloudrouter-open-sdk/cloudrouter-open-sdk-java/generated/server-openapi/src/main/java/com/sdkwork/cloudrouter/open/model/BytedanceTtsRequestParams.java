package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class BytedanceTtsRequestParams {
    private String additions;
    private BytedanceTtsAudioParams audioParams;
    private String model;
    private Map<String, String> pronunciationDict;
    private String speaker;
    private String ssml;
    private String text;
    private List<String> tone;

    public String getAdditions() {
        return this.additions;
    }

    public void setAdditions(String additions) {
        this.additions = additions;
    }

    public BytedanceTtsAudioParams getAudioParams() {
        return this.audioParams;
    }

    public void setAudioParams(BytedanceTtsAudioParams audioParams) {
        this.audioParams = audioParams;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Map<String, String> getPronunciationDict() {
        return this.pronunciationDict;
    }

    public void setPronunciationDict(Map<String, String> pronunciationDict) {
        this.pronunciationDict = pronunciationDict;
    }

    public String getSpeaker() {
        return this.speaker;
    }

    public void setSpeaker(String speaker) {
        this.speaker = speaker;
    }

    public String getSsml() {
        return this.ssml;
    }

    public void setSsml(String ssml) {
        this.ssml = ssml;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public List<String> getTone() {
        return this.tone;
    }

    public void setTone(List<String> tone) {
        this.tone = tone;
    }
}
