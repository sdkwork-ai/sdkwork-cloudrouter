package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class KlingImageTaskData {
    private Integer createdAt;
    private String taskId;
    private Map<String, String> taskInfo;
    private KlingImageTaskResult taskResult;
    private String taskStatus;
    private String taskStatusMsg;
    private Integer updatedAt;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public Map<String, String> getTaskInfo() {
        return this.taskInfo;
    }

    public void setTaskInfo(Map<String, String> taskInfo) {
        this.taskInfo = taskInfo;
    }

    public KlingImageTaskResult getTaskResult() {
        return this.taskResult;
    }

    public void setTaskResult(KlingImageTaskResult taskResult) {
        this.taskResult = taskResult;
    }

    public String getTaskStatus() {
        return this.taskStatus;
    }

    public void setTaskStatus(String taskStatus) {
        this.taskStatus = taskStatus;
    }

    public String getTaskStatusMsg() {
        return this.taskStatusMsg;
    }

    public void setTaskStatusMsg(String taskStatusMsg) {
        this.taskStatusMsg = taskStatusMsg;
    }

    public Integer getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(Integer updatedAt) {
        this.updatedAt = updatedAt;
    }
}
