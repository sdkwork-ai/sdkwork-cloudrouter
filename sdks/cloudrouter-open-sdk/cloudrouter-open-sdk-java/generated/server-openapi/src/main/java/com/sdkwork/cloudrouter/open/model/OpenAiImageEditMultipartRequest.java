package com.sdkwork.cloudrouter.open.model;


public class OpenAiImageEditMultipartRequest {
    private byte[] image;
    private byte[] mask;
    private String model;
    private String prompt;

    public byte[] getImage() {
        return this.image;
    }

    public void setImage(byte[] image) {
        this.image = image;
    }

    public byte[] getMask() {
        return this.mask;
    }

    public void setMask(byte[] mask) {
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
