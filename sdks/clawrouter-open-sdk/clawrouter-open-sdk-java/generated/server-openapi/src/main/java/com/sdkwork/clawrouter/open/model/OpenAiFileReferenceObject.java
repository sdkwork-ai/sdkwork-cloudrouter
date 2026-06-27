package com.sdkwork.clawrouter.open.model;


public class OpenAiFileReferenceObject {
    private String fileData;
    private String fileId;
    private String filename;
    private String mimeType;
    private String url;

    public String getFileData() {
        return this.fileData;
    }

    public void setFileData(String fileData) {
        this.fileData = fileData;
    }

    public String getFileId() {
        return this.fileId;
    }

    public void setFileId(String fileId) {
        this.fileId = fileId;
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

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
