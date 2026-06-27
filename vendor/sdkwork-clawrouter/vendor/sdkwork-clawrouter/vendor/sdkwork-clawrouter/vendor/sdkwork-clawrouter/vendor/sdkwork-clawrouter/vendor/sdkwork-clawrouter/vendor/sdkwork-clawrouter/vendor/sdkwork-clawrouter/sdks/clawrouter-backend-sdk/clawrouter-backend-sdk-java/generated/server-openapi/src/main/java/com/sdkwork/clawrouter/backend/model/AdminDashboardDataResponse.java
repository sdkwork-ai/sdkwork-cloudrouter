package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminDashboardDataResponse {
    private String activeUsers;
    private List<AdminPieChartItem> modelDistribution;
    private List<AdminPieChartItem> multimodal;
    private List<AdminDashboardRecentUsageItem> recentUsage;
    private List<AdminDashboardTrafficItem> traffic;
    private List<AdminPieChartItem> userConsumption;

    public String getActiveUsers() {
        return this.activeUsers;
    }

    public void setActiveUsers(String activeUsers) {
        this.activeUsers = activeUsers;
    }

    public List<AdminPieChartItem> getModelDistribution() {
        return this.modelDistribution;
    }

    public void setModelDistribution(List<AdminPieChartItem> modelDistribution) {
        this.modelDistribution = modelDistribution;
    }

    public List<AdminPieChartItem> getMultimodal() {
        return this.multimodal;
    }

    public void setMultimodal(List<AdminPieChartItem> multimodal) {
        this.multimodal = multimodal;
    }

    public List<AdminDashboardRecentUsageItem> getRecentUsage() {
        return this.recentUsage;
    }

    public void setRecentUsage(List<AdminDashboardRecentUsageItem> recentUsage) {
        this.recentUsage = recentUsage;
    }

    public List<AdminDashboardTrafficItem> getTraffic() {
        return this.traffic;
    }

    public void setTraffic(List<AdminDashboardTrafficItem> traffic) {
        this.traffic = traffic;
    }

    public List<AdminPieChartItem> getUserConsumption() {
        return this.userConsumption;
    }

    public void setUserConsumption(List<AdminPieChartItem> userConsumption) {
        this.userConsumption = userConsumption;
    }
}
