package com.sdkwork.cloudrouter.open.model;


public class OpenAiFileUploadRequest {
    private byte[] file;
    private String purpose;

    public byte[] getFile() {
        return this.file;
    }

    public void setFile(byte[] file) {
        this.file = file;
    }

    public String getPurpose() {
        return this.purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }
}
