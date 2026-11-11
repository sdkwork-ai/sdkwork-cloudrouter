package com.sdkwork.cloudrouter.open.model;


public class OpenAiVideoExtendRequest {
    private String prompt;
    private String seconds;
    private String video;

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getSeconds() {
        return this.seconds;
    }

    public void setSeconds(String seconds) {
        this.seconds = seconds;
    }

    public String getVideo() {
        return this.video;
    }

    public void setVideo(String video) {
        this.video = video;
    }
}
