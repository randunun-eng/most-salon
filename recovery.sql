-- Stylists
CREATE TABLE IF NOT EXISTS stylists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    bio TEXT,
    photo_url TEXT,
    working_days TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    break_start TEXT,
    break_end TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Services
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Bookings (Includes google_event_id)
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    service_id TEXT NOT NULL,
    stylist_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL,
    google_event_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(service_id) REFERENCES services(id),
    FOREIGN KEY(stylist_id) REFERENCES stylists(id)
);

-- Stylist Integrations
CREATE TABLE IF NOT EXISTS stylist_integrations (
    id TEXT PRIMARY KEY,
    stylist_id TEXT NOT NULL,
    google_access_token TEXT,
    google_refresh_token TEXT,
    calendar_id TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(stylist_id) REFERENCES stylists(id)
);

-- Business Hours
CREATE TABLE IF NOT EXISTS business_hours (
    day_of_week INTEGER PRIMARY KEY,
    open_time TEXT,
    close_time TEXT,
    is_closed INTEGER DEFAULT 0
);

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    reason TEXT,
    stylist_id TEXT,
    FOREIGN KEY(stylist_id) REFERENCES stylists(id)
);

-- Global Settings
CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Seed Data: Stylists
INSERT OR IGNORE INTO stylists (id, name, email, phone, bio, photo_url, working_days, start_time, end_time, break_start, break_end, is_active) VALUES
('stylist-1', 'Sarah Johnson', 'sarah@salonmost.com', '+94771234567', 'Senior Hair Stylist with 10+ years experience', '/images/stylist-1.jpg', '[0,1,2,3,4,5,6]', '09:00', '19:00', '13:00', '14:00', 1),
('stylist-2', 'Michael Chen', 'michael@salonmost.com', '+94771234568', 'Color Specialist and Creative Director', '/images/stylist-2.jpg', '[0,1,2,3,4,5,6]', '09:00', '19:00', '14:00', '15:00', 1),
('stylist-3', 'Emma Williams', 'emma@salonmost.com', '+94771234569', 'Makeup Artist and Beauty Consultant', '/images/stylist-3.jpg', '[0,1,2,3,4,5,6]', '09:00', '19:00', NULL, NULL, 1);

-- Seed Data: Services
INSERT OR IGNORE INTO services (id, name, duration_minutes, price) VALUES
('service-1', 'Haircut & Styling', 60, 3500),
('service-2', 'Hair Coloring', 120, 8500),
('service-3', 'Highlights', 90, 6500),
('service-4', 'Keratin Treatment', 150, 12000),
('service-5', 'Makeup Application', 45, 4500),
('service-6', 'Bridal Package', 180, 25000),
('service-7', 'Manicure & Pedicure', 75, 3000),
('service-8', 'Facial Treatment', 60, 5500);

-- Seed Data: Business Hours (Default 9AM - 7PM)
INSERT OR IGNORE INTO business_hours (day_of_week, open_time, close_time, is_closed) VALUES
(0, '09:00', '19:00', 0),
(1, '09:00', '19:00', 0),
(2, '09:00', '19:00', 0),
(3, '09:00', '19:00', 0),
(4, '09:00', '19:00', 0),
(5, '09:00', '19:00', 0),
(6, '09:00', '19:00', 0);

-- Seed Data: Global Settings
INSERT OR IGNORE INTO global_settings (key, value) VALUES ('salon_whatsapp', '94779336857');
INSERT OR IGNORE INTO global_settings (key, value) VALUES ('salon_name', 'Most Salon');
INSERT OR IGNORE INTO global_settings (key, value) VALUES ('salon_address', '762 Pannipitiya Road, Battaramulla');
