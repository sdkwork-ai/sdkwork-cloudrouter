package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class ModelRankingsSnapshot {
    private List<ModelRankingHistoryPoint> history;
    private List<ModelRankingItem> items;
    private ModelRankingsSource source;

    public List<ModelRankingHistoryPoint> getHistory() {
        return this.history;
    }

    public void setHistory(List<ModelRankingHistoryPoint> history) {
        this.history = history;
    }

    public List<ModelRankingItem> getItems() {
        return this.items;
    }

    public void setItems(List<ModelRankingItem> items) {
        this.items = items;
    }

    public ModelRankingsSource getSource() {
        return this.source;
    }

    public void setSource(ModelRankingsSource source) {
        this.source = source;
    }
}
