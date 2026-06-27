package com.sdkwork.clawrouter.open.model;


public class OpenAiEvalRunResultCounts {
    private Integer errored;
    private Integer failed;
    private Integer passed;
    private Integer total;

    public Integer getErrored() {
        return this.errored;
    }

    public void setErrored(Integer errored) {
        this.errored = errored;
    }

    public Integer getFailed() {
        return this.failed;
    }

    public void setFailed(Integer failed) {
        this.failed = failed;
    }

    public Integer getPassed() {
        return this.passed;
    }

    public void setPassed(Integer passed) {
        this.passed = passed;
    }

    public Integer getTotal() {
        return this.total;
    }

    public void setTotal(Integer total) {
        this.total = total;
    }
}
