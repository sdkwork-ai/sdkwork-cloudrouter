package com.sdkwork.cloudrouter.open.model;


public class GoogleFileUploadMultipartRequest {
    private byte[] file;
    private String metadata;

    public byte[] getFile() {
        return this.file;
    }

    public void setFile(byte[] file) {
        this.file = file;
    }

    public String getMetadata() {
        return this.metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
}
