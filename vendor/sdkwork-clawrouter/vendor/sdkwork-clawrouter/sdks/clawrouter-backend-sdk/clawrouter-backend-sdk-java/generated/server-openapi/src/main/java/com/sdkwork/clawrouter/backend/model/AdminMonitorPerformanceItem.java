package com.sdkwork.clawrouter.backend.model;


public class AdminMonitorPerformanceItem {
    private Double cpu;
    private Double memory;
    private Double network;
    private String time;

    public Double getCpu() {
        return this.cpu;
    }

    public void setCpu(Double cpu) {
        this.cpu = cpu;
    }

    public Double getMemory() {
        return this.memory;
    }

    public void setMemory(Double memory) {
        this.memory = memory;
    }

    public Double getNetwork() {
        return this.network;
    }

    public void setNetwork(Double network) {
        this.network = network;
    }

    public String getTime() {
        return this.time;
    }

    public void setTime(String time) {
        this.time = time;
    }
}
