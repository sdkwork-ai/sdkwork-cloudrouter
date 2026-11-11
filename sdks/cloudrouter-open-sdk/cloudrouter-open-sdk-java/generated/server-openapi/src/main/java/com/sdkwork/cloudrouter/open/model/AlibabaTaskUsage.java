package com.sdkwork.cloudrouter.open.model;


public class AlibabaTaskUsage {
    private Integer sr;
    private Double duration;
    private Integer imageCount;
    private Integer inputVideoDuration;
    private Integer outputVideoDuration;
    private String ratio;

    public Integer getSr() {
        return this.sr;
    }

    public void setSr(Integer sr) {
        this.sr = sr;
    }

    public Double getDuration() {
        return this.duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public Integer getImageCount() {
        return this.imageCount;
    }

    public void setImageCount(Integer imageCount) {
        this.imageCount = imageCount;
    }

    public Integer getInputVideoDuration() {
        return this.inputVideoDuration;
    }

    public void setInputVideoDuration(Integer inputVideoDuration) {
        this.inputVideoDuration = inputVideoDuration;
    }

    public Integer getOutputVideoDuration() {
        return this.outputVideoDuration;
    }

    public void setOutputVideoDuration(Integer outputVideoDuration) {
        this.outputVideoDuration = outputVideoDuration;
    }

    public String getRatio() {
        return this.ratio;
    }

    public void setRatio(String ratio) {
        this.ratio = ratio;
    }
}
