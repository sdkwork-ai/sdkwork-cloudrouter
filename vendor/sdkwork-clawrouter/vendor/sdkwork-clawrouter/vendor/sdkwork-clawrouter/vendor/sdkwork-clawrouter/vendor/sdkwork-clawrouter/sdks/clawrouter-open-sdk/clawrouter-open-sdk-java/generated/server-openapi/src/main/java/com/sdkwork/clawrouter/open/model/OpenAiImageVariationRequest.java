package com.sdkwork.clawrouter.open.model;


public class OpenAiImageVariationRequest {
    private OpenAiImageReferenceInput image;
    private String model;
    private String size;

    public OpenAiImageReferenceInput getImage() {
        return this.image;
    }

    public void setImage(OpenAiImageReferenceInput image) {
        this.image = image;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getSize() {
        return this.size;
    }

    public void setSize(String size) {
        this.size = size;
    }
}
