package com.sdkwork.clawrouter.open.model;


public class OpenAiFileUploadRequest {
    private String file;
    private String purpose;

    public String getFile() {
        return this.file;
    }

    public void setFile(String file) {
        this.file = file;
    }

    public String getPurpose() {
        return this.purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }
}
