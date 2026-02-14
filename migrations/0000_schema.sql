-- Migration 0000: Initial Schema and Data

-- Stylists Table
CREATE TABLE stylists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    bio TEXT,
    photo_url TEXT,
    working_days TEXT NOT NULL, -- JSON array of day indices (0-6)
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    break_start TEXT,
    break_end TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Services Table
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Bookings Table
CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    service_id TEXT NOT NULL,
    stylist_id TEXT NOT NULL,
    start_time TEXT NOT NULL, -- ISO Date String
    end_time TEXT NOT NULL, -- ISO Date String
    status TEXT NOT NULL, -- pending, confirmed, cancelled
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(service_id) REFERENCES services(id),
    FOREIGN KEY(stylist_id) REFERENCES stylists(id)
);

-- Seed Data: Stylists (Updated to 9AM-7PM everyday)
INSERT INTO stylists (id, name, email, phone, bio, photo_url, working_days, start_time, end_time, break_start, break_end, is_active) VALUES
('stylist-1', 'Sarah Johnson', 'sarah@salonmost.com', '+94771234567', 'Senior Hair Stylist with 10+ years experience', '/images/stylist-1.jpg', '[0,1,2,3,4,5,6]', '09:00', '19:00', '13:00', '14:00', 1),
('stylist-2', 'Michael Chen', 'michael@salonmost.com', '+94771234568', 'Color Specialist and Creative Director', '/images/stylist-2.jpg', '[0,1,2,3,4,5,6]', '09:00', '19:00', '14:00', '15:00', 1),
('stylist-3', 'Emma Williams', 'emma@salonmost.com', '+94771234569', 'Makeup Artist and Beauty Consultant', '/images/stylist-3.jpg', '[0,1,2,3,4,5,6]', '09:00', '19:00', NULL, NULL, 1);

-- Seed Data: Services
INSERT INTO services (id, name, duration_minutes, price) VALUES
('service-1', 'Haircut & Styling', 60, 3500),
('service-2', 'Hair Coloring', 120, 8500),
('service-3', 'Highlights', 90, 6500),
('service-4', 'Keratin Treatment', 150, 12000),
('service-5', 'Makeup Application', 45, 4500),
('service-6', 'Bridal Package', 180, 25000),
('service-7', 'Manicure & Pedicure', 75, 3000),
('service-8', 'Facial Treatment', 60, 5500);

-- Note: No seed bookings to start fresh, or user can add manually.
