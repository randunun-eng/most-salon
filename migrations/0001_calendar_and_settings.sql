-- Migration 0001: Calendar Integration and Business Settings

-- Add google_event_id to bookings table
ALTER TABLE bookings ADD COLUMN google_event_id TEXT;

-- Stylist Integrations Table (for per-stylist Google Calendar sync)
CREATE TABLE stylist_integrations (
    id TEXT PRIMARY KEY,
    stylist_id TEXT NOT NULL,
    google_access_token TEXT,
    google_refresh_token TEXT,
    calendar_id TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(stylist_id) REFERENCES stylists(id)
);

-- Business Hours Table
CREATE TABLE business_hours (
    day_of_week INTEGER PRIMARY KEY, -- 0=Sunday, 6=Saturday
    open_time TEXT,      -- 09:00
    close_time TEXT,     -- 18:00
    is_closed INTEGER DEFAULT 0 -- 0=Open, 1=Closed
);

-- Initial Business Hours (Default 9AM - 7PM)
INSERT INTO business_hours (day_of_week, open_time, close_time, is_closed) VALUES
(0, '09:00', '19:00', 0),
(1, '09:00', '19:00', 0),
(2, '09:00', '19:00', 0),
(3, '09:00', '19:00', 0),
(4, '09:00', '19:00', 0),
(5, '09:00', '19:00', 0),
(6, '09:00', '19:00', 0);

-- Holidays Table
CREATE TABLE holidays (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL, -- YYYY-MM-DD
    reason TEXT,
    stylist_id TEXT, -- NULL for global holiday
    FOREIGN KEY(stylist_id) REFERENCES stylists(id)
);
