package com.sdkwork.cloudrouter.open.model;


public class ElevenLabsMusicGenerationRequest {
    private ElevenLabsMusicPrompt compositionPlan;
    private String finetuneId;
    private Double finetuneStrength;
    private Boolean forceInstrumental;
    private String generationMode;
    private String lyricsText;
    private String modelId;
    private Integer musicLengthMs;
    private ElevenLabsMusicPrompt musicPrompt;
    private String prompt;
    private Boolean respectSectionsDurations;
    private Integer seed;
    private Boolean signWithC2pa;
    private Boolean storeForInpainting;
    private Boolean usePhoneticNames;

    public ElevenLabsMusicPrompt getCompositionPlan() {
        return this.compositionPlan;
    }

    public void setCompositionPlan(ElevenLabsMusicPrompt compositionPlan) {
        this.compositionPlan = compositionPlan;
    }

    public String getFinetuneId() {
        return this.finetuneId;
    }

    public void setFinetuneId(String finetuneId) {
        this.finetuneId = finetuneId;
    }

    public Double getFinetuneStrength() {
        return this.finetuneStrength;
    }

    public void setFinetuneStrength(Double finetuneStrength) {
        this.finetuneStrength = finetuneStrength;
    }

    public Boolean getForceInstrumental() {
        return this.forceInstrumental;
    }

    public void setForceInstrumental(Boolean forceInstrumental) {
        this.forceInstrumental = forceInstrumental;
    }

    public String getGenerationMode() {
        return this.generationMode;
    }

    public void setGenerationMode(String generationMode) {
        this.generationMode = generationMode;
    }

    public String getLyricsText() {
        return this.lyricsText;
    }

    public void setLyricsText(String lyricsText) {
        this.lyricsText = lyricsText;
    }

    public String getModelId() {
        return this.modelId;
    }

    public void setModelId(String modelId) {
        this.modelId = modelId;
    }

    public Integer getMusicLengthMs() {
        return this.musicLengthMs;
    }

    public void setMusicLengthMs(Integer musicLengthMs) {
        this.musicLengthMs = musicLengthMs;
    }

    public ElevenLabsMusicPrompt getMusicPrompt() {
        return this.musicPrompt;
    }

    public void setMusicPrompt(ElevenLabsMusicPrompt musicPrompt) {
        this.musicPrompt = musicPrompt;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public Boolean getRespectSectionsDurations() {
        return this.respectSectionsDurations;
    }

    public void setRespectSectionsDurations(Boolean respectSectionsDurations) {
        this.respectSectionsDurations = respectSectionsDurations;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public Boolean getSignWithC2pa() {
        return this.signWithC2pa;
    }

    public void setSignWithC2pa(Boolean signWithC2pa) {
        this.signWithC2pa = signWithC2pa;
    }

    public Boolean getStoreForInpainting() {
        return this.storeForInpainting;
    }

    public void setStoreForInpainting(Boolean storeForInpainting) {
        this.storeForInpainting = storeForInpainting;
    }

    public Boolean getUsePhoneticNames() {
        return this.usePhoneticNames;
    }

    public void setUsePhoneticNames(Boolean usePhoneticNames) {
        this.usePhoneticNames = usePhoneticNames;
    }
}
