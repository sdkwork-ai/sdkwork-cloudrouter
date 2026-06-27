package com.sdkwork.clawrouter.backend.model;


public class ModelRankingsJobsListResult {
    private String code;
    private ModelRankingRefreshJobHistoryPage data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public ModelRankingRefreshJobHistoryPage getData() {
        return this.data;
    }

    public void setData(ModelRankingRefreshJobHistoryPage data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
