package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminRecordLogsResponse {
    private List<AdminRecordLogItem> logs;
    private String page;
    private String pageSize;
    private String total;

    public List<AdminRecordLogItem> getLogs() {
        return this.logs;
    }

    public void setLogs(List<AdminRecordLogItem> logs) {
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
