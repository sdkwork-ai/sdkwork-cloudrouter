package com.sdkwork.clawrouter.open.model;


public class OpenAiChatContentPart {
    private OpenAiChatFile file;
    private OpenAiChatImageUrl imageUrl;
    private OpenAiChatInputAudio inputAudio;
    private String text;
    private String type;

    public OpenAiChatFile getFile() {
        return this.file;
    }

    public void setFile(OpenAiChatFile file) {
        this.file = file;
    }

    public OpenAiChatImageUrl getImageUrl() {
        return this.imageUrl;
    }

    public void setImageUrl(OpenAiChatImageUrl imageUrl) {
        this.imageUrl = imageUrl;
    }

    public OpenAiChatInputAudio getInputAudio() {
        return this.inputAudio;
    }

    public void setInputAudio(OpenAiChatInputAudio inputAudio) {
        this.inputAudio = inputAudio;
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
}
