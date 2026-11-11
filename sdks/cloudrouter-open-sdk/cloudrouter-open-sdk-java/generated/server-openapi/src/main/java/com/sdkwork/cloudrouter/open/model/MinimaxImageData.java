package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class MinimaxImageData {
    private List<String> imageBase64;
    private List<String> imageUrls;

    public List<String> getImageBase64() {
        return this.imageBase64;
    }

    public void setImageBase64(List<String> imageBase64) {
        this.imageBase64 = imageBase64;
    }

    public List<String> getImageUrls() {
        return this.imageUrls;
    }

    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls;
    }
}
