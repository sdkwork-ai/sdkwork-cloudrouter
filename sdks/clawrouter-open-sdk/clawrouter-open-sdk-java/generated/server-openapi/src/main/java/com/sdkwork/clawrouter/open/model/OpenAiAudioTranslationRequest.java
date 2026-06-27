package com.sdkwork.clawrouter.open.model;


public class OpenAiAudioTranslationRequest {
    private OpenAiFileReferenceInput file;
    private String model;
    private String prompt;
    private String responseFormat;

    public OpenAiFileReferenceInput getFile() {
        return this.file;
    }

    public void setFile(OpenAiFileReferenceInput file) {
        this.file = file;
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

    public String getResponseFormat() {
        return this.responseFormat;
    }

    public void setResponseFormat(String responseFormat) {
        this.responseFormat = responseFormat;
    }
}
