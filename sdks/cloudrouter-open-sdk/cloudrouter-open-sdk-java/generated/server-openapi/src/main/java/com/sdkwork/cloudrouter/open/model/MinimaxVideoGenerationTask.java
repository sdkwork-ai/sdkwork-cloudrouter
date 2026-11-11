package com.sdkwork.cloudrouter.open.model;


public class MinimaxVideoGenerationTask {
    private MinimaxBaseResp baseResp;
    private String fileId;
    private String status;
    private String taskId;
    private Integer videoHeight;
    private Integer videoWidth;

    public MinimaxBaseResp getBaseResp() {
        return this.baseResp;
    }

    public void setBaseResp(MinimaxBaseResp baseResp) {
        this.baseResp = baseResp;
    }

    public String getFileId() {
        return this.fileId;
    }

    public void setFileId(String fileId) {
        this.fileId = fileId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public Integer getVideoHeight() {
        return this.videoHeight;
    }

    public void setVideoHeight(Integer videoHeight) {
        this.videoHeight = videoHeight;
    }

    public Integer getVideoWidth() {
        return this.videoWidth;
    }

    public void setVideoWidth(Integer videoWidth) {
        this.videoWidth = videoWidth;
    }
}
