package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RoutingUsageSnapshot {
    private List<RoutingUsageData> chartData;
    private List<RoutingModelStats> modelStats;

    public List<RoutingUsageData> getChartData() {
        return this.chartData;
    }

    public void setChartData(List<RoutingUsageData> chartData) {
        this.chartData = chartData;
    }

    public List<RoutingModelStats> getModelStats() {
        return this.modelStats;
    }

    public void setModelStats(List<RoutingModelStats> modelStats) {
        this.modelStats = modelStats;
    }
}
