package com.sdkwork.clawrouter.open.model;


public class OpenAiImageEditRequest {
    private OpenAiImageReferenceInputList image;
    private OpenAiImageReferenceInput mask;
    private String model;
    private String prompt;

    public OpenAiImageReferenceInputList getImage() {
        return this.image;
    }

    public void setImage(OpenAiImageReferenceInputList image) {
        this.image = image;
    }

    public OpenAiImageReferenceInput getMask() {
        return this.mask;
    }

    public void setMask(OpenAiImageReferenceInput mask) {
        this.mask = mask;
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
}
