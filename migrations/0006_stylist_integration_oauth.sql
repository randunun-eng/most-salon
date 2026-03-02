-- Add per-stylist OAuth client fields for calendar integration managed from admin dashboard
ALTER TABLE stylist_integrations ADD COLUMN google_client_id TEXT;
ALTER TABLE stylist_integrations ADD COLUMN google_client_secret TEXT;

-- Ensure one integration row per stylist so admin edits update in-place
CREATE UNIQUE INDEX IF NOT EXISTS idx_stylist_integrations_stylist_id ON stylist_integrations(stylist_id);
