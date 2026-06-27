package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class DashboardOverviewResponse {
    private List<DashboardAnnouncement> announcements;
    private List<DashboardChartPoint> chartData;
    private List<DashboardConfigurationDomain> configurationDomains;
    private List<DashboardSparklinePoint> multimodalSparkline;
    private List<DashboardSparklinePoint> performanceSparkline;
    private List<DashboardSparklinePoint> requestSparkline;
    private DashboardOverviewSummary summary;
    private List<DashboardTopModel> topModels;
    private List<String> warnings;

    public List<DashboardAnnouncement> getAnnouncements() {
        return this.announcements;
    }

    public void setAnnouncements(List<DashboardAnnouncement> announcements) {
        this.announcements = announcements;
    }

    public List<DashboardChartPoint> getChartData() {
        return this.chartData;
    }

    public void setChartData(List<DashboardChartPoint> chartData) {
        this.chartData = chartData;
    }

    public List<DashboardConfigurationDomain> getConfigurationDomains() {
        return this.configurationDomains;
    }

    public void setConfigurationDomains(List<DashboardConfigurationDomain> configurationDomains) {
        this.configurationDomains = configurationDomains;
    }

    public List<DashboardSparklinePoint> getMultimodalSparkline() {
        return this.multimodalSparkline;
    }

    public void setMultimodalSparkline(List<DashboardSparklinePoint> multimodalSparkline) {
        this.multimodalSparkline = multimodalSparkline;
    }

    public List<DashboardSparklinePoint> getPerformanceSparkline() {
        return this.performanceSparkline;
    }

    public void setPerformanceSparkline(List<DashboardSparklinePoint> performanceSparkline) {
        this.performanceSparkline = performanceSparkline;
    }

    public List<DashboardSparklinePoint> getRequestSparkline() {
        return this.requestSparkline;
    }

    public void setRequestSparkline(List<DashboardSparklinePoint> requestSparkline) {
        this.requestSparkline = requestSparkline;
    }

    public DashboardOverviewSummary getSummary() {
        return this.summary;
    }

    public void setSummary(DashboardOverviewSummary summary) {
        this.summary = summary;
    }

    public List<DashboardTopModel> getTopModels() {
        return this.topModels;
    }

    public void setTopModels(List<DashboardTopModel> topModels) {
        this.topModels = topModels;
    }

    public List<String> getWarnings() {
        return this.warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }
}
