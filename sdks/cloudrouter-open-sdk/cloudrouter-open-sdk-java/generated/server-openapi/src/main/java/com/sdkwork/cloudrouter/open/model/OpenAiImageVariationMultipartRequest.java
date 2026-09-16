package com.sdkwork.cloudrouter.open.model;


public class OpenAiImageVariationMultipartRequest {
    private byte[] image;
    private String model;
    private String size;

    public byte[] getImage() {
        return this.image;
    }

    public void setImage(byte[] image) {
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
