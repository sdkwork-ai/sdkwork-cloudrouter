package com.sdkwork.clawrouter.app.model;


public class DashboardTopModel {
    private Double cost;
    private Boolean isUp;
    private String modality;
    private String name;
    private String rank;
    private String requests;
    private String supplier;
    private String trend;

    public Double getCost() {
        return this.cost;
    }

    public void setCost(Double cost) {
        this.cost = cost;
    }

    public Boolean getIsUp() {
        return this.isUp;
    }

    public void setIsUp(Boolean isUp) {
        this.isUp = isUp;
    }

    public String getModality() {
        return this.modality;
    }

    public void setModality(String modality) {
        this.modality = modality;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRank() {
        return this.rank;
    }

    public void setRank(String rank) {
        this.rank = rank;
    }

    public String getRequests() {
        return this.requests;
    }

    public void setRequests(String requests) {
        this.requests = requests;
    }

    public String getSupplier() {
        return this.supplier;
    }

    public void setSupplier(String supplier) {
        this.supplier = supplier;
    }

    public String getTrend() {
        return this.trend;
    }

    public void setTrend(String trend) {
        this.trend = trend;
    }
}
