-- Migration 0003: Chat System Schema

-- Chats Table
CREATE TABLE chats (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL, -- Logical ID from localStorage/cookie
    client_name TEXT,
    client_phone TEXT,
    ai_status INTEGER DEFAULT 1, -- 1=Active, 0=Paused (Human Mode)
    last_message_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Messages Table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user', 'assistant', 'admin'
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Index for faster history retrieval
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_chats_client_id ON chats(client_id);
