package com.sdkwork.cloudrouter.open.model;


public class ArkContentPart {
    private ArkAudioSource audioUrl;
    private ArkDraftTask draftTask;
    private ArkImageSource imageUrl;
    private String role;
    private String text;
    private String type;
    private ArkVideoSource videoUrl;

    public ArkAudioSource getAudioUrl() {
        return this.audioUrl;
    }

    public void setAudioUrl(ArkAudioSource audioUrl) {
        this.audioUrl = audioUrl;
    }

    public ArkDraftTask getDraftTask() {
        return this.draftTask;
    }

    public void setDraftTask(ArkDraftTask draftTask) {
        this.draftTask = draftTask;
    }

    public ArkImageSource getImageUrl() {
        return this.imageUrl;
    }

    public void setImageUrl(ArkImageSource imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public ArkVideoSource getVideoUrl() {
        return this.videoUrl;
    }

    public void setVideoUrl(ArkVideoSource videoUrl) {
        this.videoUrl = videoUrl;
    }
}
