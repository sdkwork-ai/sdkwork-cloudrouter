package com.sdkwork.clawrouter.open.model;


public class OpenAiVectorStoreFileCounts {
    private Integer cancelled;
    private Integer completed;
    private Integer failed;
    private Integer inProgress;
    private Integer total;

    public Integer getCancelled() {
        return this.cancelled;
    }

    public void setCancelled(Integer cancelled) {
        this.cancelled = cancelled;
    }

    public Integer getCompleted() {
        return this.completed;
    }

    public void setCompleted(Integer completed) {
        this.completed = completed;
    }

    public Integer getFailed() {
        return this.failed;
    }

    public void setFailed(Integer failed) {
        this.failed = failed;
    }

    public Integer getInProgress() {
        return this.inProgress;
    }

    public void setInProgress(Integer inProgress) {
        this.inProgress = inProgress;
    }

    public Integer getTotal() {
        return this.total;
    }

    public void setTotal(Integer total) {
        this.total = total;
    }
}
