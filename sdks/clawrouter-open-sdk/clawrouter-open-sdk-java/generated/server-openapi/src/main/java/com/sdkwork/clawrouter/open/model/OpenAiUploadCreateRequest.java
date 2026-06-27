package com.sdkwork.clawrouter.open.model;


public class OpenAiUploadCreateRequest {
    private Integer bytes;
    private String filename;
    private String mimeType;
    private String purpose;

    public Integer getBytes() {
        return this.bytes;
    }

    public void setBytes(Integer bytes) {
        this.bytes = bytes;
    }

    public String getFilename() {
        return this.filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getMimeType() {
        return this.mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getPurpose() {
        return this.purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }
}
