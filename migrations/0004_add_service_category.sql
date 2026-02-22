-- Migration 0004: Add Category to Services
ALTER TABLE services ADD COLUMN category TEXT DEFAULT 'Hair';
