package com.sdkwork.clawrouter.open.model;


public class OpenAiImageVariationMultipartRequest {
    private String image;
    private String model;
    private String size;

    public String getImage() {
        return this.image;
    }

    public void setImage(String image) {
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
