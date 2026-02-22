-- migrations/0005_booking_state.sql
ALTER TABLE chats ADD COLUMN booking_state TEXT DEFAULT NULL;
