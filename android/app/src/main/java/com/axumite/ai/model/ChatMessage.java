package com.axumite.ai.model;

public class ChatMessage {
    private String id;
    private String message;
    private String timestamp;
    private boolean isAi;

    public ChatMessage(String id, String message, String timestamp, boolean isAi) {
        this.id = id;
        this.message = message;
        this.timestamp = timestamp;
        this.isAi = isAi;
    }

    public String getId() {
        return id;
    }

    public String getMessage() {
        return message;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public boolean isAi() {
        return isAi;
    }
}
