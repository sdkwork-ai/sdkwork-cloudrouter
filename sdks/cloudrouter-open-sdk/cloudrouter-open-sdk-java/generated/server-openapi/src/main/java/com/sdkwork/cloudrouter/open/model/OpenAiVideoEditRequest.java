package com.sdkwork.cloudrouter.open.model;


public class OpenAiVideoEditRequest {
    private String prompt;
    private String video;

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getVideo() {
        return this.video;
    }

    public void setVideo(String video) {
        this.video = video;
    }
}
