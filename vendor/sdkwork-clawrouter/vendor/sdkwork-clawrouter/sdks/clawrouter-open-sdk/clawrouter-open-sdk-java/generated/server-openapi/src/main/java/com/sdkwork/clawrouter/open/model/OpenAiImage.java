package com.sdkwork.clawrouter.open.model;


public class OpenAiImage {
    private String b64Json;
    private String mimeType;
    private String revisedPrompt;
    private String url;

    public String getB64Json() {
        return this.b64Json;
    }

    public void setB64Json(String b64Json) {
        this.b64Json = b64Json;
    }

    public String getMimeType() {
        return this.mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getRevisedPrompt() {
        return this.revisedPrompt;
    }

    public void setRevisedPrompt(String revisedPrompt) {
        this.revisedPrompt = revisedPrompt;
    }

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
