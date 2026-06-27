package com.sdkwork.clawrouter.open.model;


public class OpenAiBatchRequestCounts {
    private Integer completed;
    private Integer failed;
    private Integer total;

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

    public Integer getTotal() {
        return this.total;
    }

    public void setTotal(Integer total) {
        this.total = total;
    }
}
