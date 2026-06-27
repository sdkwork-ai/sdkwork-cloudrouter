package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class UsageLogsResponse {
    private List<UsageLogItem> logs;
    private String page;
    private String pageSize;
    private String total;

    public List<UsageLogItem> getLogs() {
        return this.logs;
    }

    public void setLogs(List<UsageLogItem> logs) {
        this.logs = logs;
    }

    public String getPage() {
        return this.page;
    }

    public void setPage(String page) {
        this.page = page;
    }

    public String getPageSize() {
        return this.pageSize;
    }

    public void setPageSize(String pageSize) {
        this.pageSize = pageSize;
    }

    public String getTotal() {
        return this.total;
    }

    public void setTotal(String total) {
        this.total = total;
    }
}
