-- Migration 0002: Global Salon Settings
CREATE TABLE global_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Default Settings
INSERT INTO global_settings (key, value) VALUES ('salon_whatsapp', '94779336857');
INSERT INTO global_settings (key, value) VALUES ('salon_name', 'Most Salon');
INSERT INTO global_settings (key, value) VALUES ('salon_address', '762 Pannipitiya Road, Battaramulla');
