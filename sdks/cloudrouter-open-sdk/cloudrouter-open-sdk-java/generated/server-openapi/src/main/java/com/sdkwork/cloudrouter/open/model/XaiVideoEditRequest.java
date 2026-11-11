package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class XaiVideoEditRequest {
    private String model;
    private Map<String, String> output;
    private String prompt;
    private Map<String, String> storageOptions;
    private String user;
    private XaiVideoInput video;

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Map<String, String> getOutput() {
        return this.output;
    }

    public void setOutput(Map<String, String> output) {
        this.output = output;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public Map<String, String> getStorageOptions() {
        return this.storageOptions;
    }

    public void setStorageOptions(Map<String, String> storageOptions) {
        this.storageOptions = storageOptions;
    }

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public XaiVideoInput getVideo() {
        return this.video;
    }

    public void setVideo(XaiVideoInput video) {
        this.video = video;
    }
}
