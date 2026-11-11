package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class OpenAiVideoCreateRequest {
    private Map<String, String> inputReference;
    private String model;
    private String prompt;
    private String seconds;
    private String size;

    public Map<String, String> getInputReference() {
        return this.inputReference;
    }

    public void setInputReference(Map<String, String> inputReference) {
        this.inputReference = inputReference;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

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

    public String getSize() {
        return this.size;
    }

    public void setSize(String size) {
        this.size = size;
    }
}
