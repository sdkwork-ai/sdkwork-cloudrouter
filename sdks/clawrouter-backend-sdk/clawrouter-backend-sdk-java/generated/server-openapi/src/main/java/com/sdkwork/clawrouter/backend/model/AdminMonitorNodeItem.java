package com.sdkwork.clawrouter.backend.model;


public class AdminMonitorNodeItem {
    private Double cpu;
    private String id;
    private String ip;
    private Double memory;
    private String name;
    private String region;
    private String status;
    private String uptime;

    public Double getCpu() {
        return this.cpu;
    }

    public void setCpu(Double cpu) {
        this.cpu = cpu;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getIp() {
        return this.ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public Double getMemory() {
        return this.memory;
    }

    public void setMemory(Double memory) {
        this.memory = memory;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRegion() {
        return this.region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getUptime() {
        return this.uptime;
    }

    public void setUptime(String uptime) {
        this.uptime = uptime;
    }
}
