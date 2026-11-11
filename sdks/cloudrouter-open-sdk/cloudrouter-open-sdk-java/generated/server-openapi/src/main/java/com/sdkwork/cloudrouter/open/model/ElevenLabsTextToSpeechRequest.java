package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class ElevenLabsTextToSpeechRequest {
    private Boolean applyLanguageTextNormalization;
    private String applyTextNormalization;
    private ElevenLabsAudioEffects audioEffects;
    private String languageCode;
    private String modelId;
    private List<String> nextRequestIds;
    private String nextText;
    private List<String> previousRequestIds;
    private String previousText;
    private List<ElevenLabsPronunciationDictionaryLocator> pronunciationDictionaryLocators;
    private Integer seed;
    private String text;
    private Boolean usePvcAsIvc;
    private ElevenLabsVoiceSettings voiceSettings;

    public Boolean getApplyLanguageTextNormalization() {
        return this.applyLanguageTextNormalization;
    }

    public void setApplyLanguageTextNormalization(Boolean applyLanguageTextNormalization) {
        this.applyLanguageTextNormalization = applyLanguageTextNormalization;
    }

    public String getApplyTextNormalization() {
        return this.applyTextNormalization;
    }

    public void setApplyTextNormalization(String applyTextNormalization) {
        this.applyTextNormalization = applyTextNormalization;
    }

    public ElevenLabsAudioEffects getAudioEffects() {
        return this.audioEffects;
    }

    public void setAudioEffects(ElevenLabsAudioEffects audioEffects) {
        this.audioEffects = audioEffects;
    }

    public String getLanguageCode() {
        return this.languageCode;
    }

    public void setLanguageCode(String languageCode) {
        this.languageCode = languageCode;
    }

    public String getModelId() {
        return this.modelId;
    }

    public void setModelId(String modelId) {
        this.modelId = modelId;
    }

    public List<String> getNextRequestIds() {
        return this.nextRequestIds;
    }

    public void setNextRequestIds(List<String> nextRequestIds) {
        this.nextRequestIds = nextRequestIds;
    }

    public String getNextText() {
        return this.nextText;
    }

    public void setNextText(String nextText) {
        this.nextText = nextText;
    }

    public List<String> getPreviousRequestIds() {
        return this.previousRequestIds;
    }

    public void setPreviousRequestIds(List<String> previousRequestIds) {
        this.previousRequestIds = previousRequestIds;
    }

    public String getPreviousText() {
        return this.previousText;
    }

    public void setPreviousText(String previousText) {
        this.previousText = previousText;
    }

    public List<ElevenLabsPronunciationDictionaryLocator> getPronunciationDictionaryLocators() {
        return this.pronunciationDictionaryLocators;
    }

    public void setPronunciationDictionaryLocators(List<ElevenLabsPronunciationDictionaryLocator> pronunciationDictionaryLocators) {
        this.pronunciationDictionaryLocators = pronunciationDictionaryLocators;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Boolean getUsePvcAsIvc() {
        return this.usePvcAsIvc;
    }

    public void setUsePvcAsIvc(Boolean usePvcAsIvc) {
        this.usePvcAsIvc = usePvcAsIvc;
    }

    public ElevenLabsVoiceSettings getVoiceSettings() {
        return this.voiceSettings;
    }

    public void setVoiceSettings(ElevenLabsVoiceSettings voiceSettings) {
        this.voiceSettings = voiceSettings;
    }
}
