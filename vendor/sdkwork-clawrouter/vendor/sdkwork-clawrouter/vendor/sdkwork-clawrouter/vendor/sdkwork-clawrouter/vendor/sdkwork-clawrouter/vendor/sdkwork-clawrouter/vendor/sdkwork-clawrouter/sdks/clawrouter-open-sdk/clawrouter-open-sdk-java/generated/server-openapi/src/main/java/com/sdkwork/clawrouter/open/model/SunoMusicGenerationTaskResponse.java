package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class SunoMusicGenerationTaskResponse {
    private String createdAt;
    private ProviderTaskError error;
    private String id;
    private String status;
    private String taskId;
    private String title;
    private List<SunoMusicTrack> tracks;
    private String updatedAt;

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public ProviderTaskError getError() {
        return this.error;
    }

    public void setError(ProviderTaskError error) {
        this.error = error;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public List<SunoMusicTrack> getTracks() {
        return this.tracks;
    }

    public void setTracks(List<SunoMusicTrack> tracks) {
        this.tracks = tracks;
    }

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
