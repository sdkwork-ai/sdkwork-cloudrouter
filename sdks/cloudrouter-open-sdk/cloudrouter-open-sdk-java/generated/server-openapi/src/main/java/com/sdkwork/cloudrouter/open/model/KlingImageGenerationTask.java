package com.sdkwork.cloudrouter.open.model;


public class KlingImageGenerationTask {
    private Integer code;
    private KlingImageTaskData data;
    private String message;
    private String requestId;

    public Integer getCode() {
        return this.code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public KlingImageTaskData getData() {
        return this.data;
    }

    public void setData(KlingImageTaskData data) {
        this.data = data;
    }

    public String getMessage() {
        return this.message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
