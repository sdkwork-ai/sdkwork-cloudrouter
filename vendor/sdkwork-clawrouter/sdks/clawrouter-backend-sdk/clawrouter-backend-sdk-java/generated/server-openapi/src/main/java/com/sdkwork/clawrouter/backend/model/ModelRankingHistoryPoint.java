package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class ModelRankingHistoryPoint {
    private String date;
    private List<ModelRankingHistoryEntry> entries;
    private String index;

    public String getDate() {
        return this.date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public List<ModelRankingHistoryEntry> getEntries() {
        return this.entries;
    }

    public void setEntries(List<ModelRankingHistoryEntry> entries) {
        this.entries = entries;
    }

    public String getIndex() {
        return this.index;
    }

    public void setIndex(String index) {
        this.index = index;
    }
}
