package com.sdkwork.cloudrouter.open.model;


public class OpenAiVoiceCreateMultipartRequest {
    private byte[] file;
    private String model;
    private String name;
    private String prompt;
    private String scriptHint;
    private String type;

    public byte[] getFile() {
        return this.file;
    }

    public void setFile(byte[] file) {
        this.file = file;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getScriptHint() {
        return this.scriptHint;
    }

    public void setScriptHint(String scriptHint) {
        this.scriptHint = scriptHint;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
