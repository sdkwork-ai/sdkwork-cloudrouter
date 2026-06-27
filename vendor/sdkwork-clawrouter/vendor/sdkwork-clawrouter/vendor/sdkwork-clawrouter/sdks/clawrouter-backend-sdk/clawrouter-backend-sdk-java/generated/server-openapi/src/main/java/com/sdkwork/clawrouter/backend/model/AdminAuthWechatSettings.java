package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAuthWechatSettings {
    private List<AdminAuthWechatMini> mini;
    private List<AdminAuthWechatOfficial> official;

    public List<AdminAuthWechatMini> getMini() {
        return this.mini;
    }

    public void setMini(List<AdminAuthWechatMini> mini) {
        this.mini = mini;
    }

    public List<AdminAuthWechatOfficial> getOfficial() {
        return this.official;
    }

    public void setOfficial(List<AdminAuthWechatOfficial> official) {
        this.official = official;
    }
}
