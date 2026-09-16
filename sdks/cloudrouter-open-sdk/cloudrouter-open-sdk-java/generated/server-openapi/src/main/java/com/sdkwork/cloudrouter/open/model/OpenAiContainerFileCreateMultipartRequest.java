package com.sdkwork.cloudrouter.open.model;


public class OpenAiContainerFileCreateMultipartRequest {
    private byte[] file;
    private String metadata;
    private String purpose;

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

    public String getPurpose() {
        return this.purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }
}
