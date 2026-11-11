package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class MinimaxTextToSpeechRequest {
    private Map<String, String> audioSetting;
    private String languageBoost;
    private String model;
    private String outputFormat;
    private Map<String, String> pronunciationDict;
    private Boolean stream;
    private MinimaxStreamOptions streamOptions;
    private Boolean subtitleEnable;
    private String subtitleType;
    private String text;
    private String textNormalizationMode;
    private List<MinimaxTimbreWeight> timbreWeights;
    private MinimaxVoiceModify voiceModify;
    private Map<String, String> voiceSetting;

    public Map<String, String> getAudioSetting() {
        return this.audioSetting;
    }

    public void setAudioSetting(Map<String, String> audioSetting) {
        this.audioSetting = audioSetting;
    }

    public String getLanguageBoost() {
        return this.languageBoost;
    }

    public void setLanguageBoost(String languageBoost) {
        this.languageBoost = languageBoost;
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

    public Map<String, String> getPronunciationDict() {
        return this.pronunciationDict;
    }

    public void setPronunciationDict(Map<String, String> pronunciationDict) {
        this.pronunciationDict = pronunciationDict;
    }

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }

    public MinimaxStreamOptions getStreamOptions() {
        return this.streamOptions;
    }

    public void setStreamOptions(MinimaxStreamOptions streamOptions) {
        this.streamOptions = streamOptions;
    }

    public Boolean getSubtitleEnable() {
        return this.subtitleEnable;
    }

    public void setSubtitleEnable(Boolean subtitleEnable) {
        this.subtitleEnable = subtitleEnable;
    }

    public String getSubtitleType() {
        return this.subtitleType;
    }

    public void setSubtitleType(String subtitleType) {
        this.subtitleType = subtitleType;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getTextNormalizationMode() {
        return this.textNormalizationMode;
    }

    public void setTextNormalizationMode(String textNormalizationMode) {
        this.textNormalizationMode = textNormalizationMode;
    }

    public List<MinimaxTimbreWeight> getTimbreWeights() {
        return this.timbreWeights;
    }

    public void setTimbreWeights(List<MinimaxTimbreWeight> timbreWeights) {
        this.timbreWeights = timbreWeights;
    }

    public MinimaxVoiceModify getVoiceModify() {
        return this.voiceModify;
    }

    public void setVoiceModify(MinimaxVoiceModify voiceModify) {
        this.voiceModify = voiceModify;
    }

    public Map<String, String> getVoiceSetting() {
        return this.voiceSetting;
    }

    public void setVoiceSetting(Map<String, String> voiceSetting) {
        this.voiceSetting = voiceSetting;
    }
}
