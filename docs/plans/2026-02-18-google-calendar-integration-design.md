# Design: Google Calendar Two-Way Sync + Smart Scheduling
Date: 2026-02-18

## Problem Statement

The salon booking system has a broken integration layer:
- All DB function calls in `bookings.ts`, `availability.ts`, `calendar/sync.ts` are missing the required `db` parameter
- Bookings are never pushed to Google Calendar when created
- The owner cannot block time from his phone and have it reflect in available slots
- `lib/calendar-ai.ts` is referenced but does not exist
- WhatsApp notification after chatbot booking is not wired up

## Goals

1. Fix all broken DB parameter calls across the API layer
2. Two-way Google Calendar sync (one shared salon calendar)
3. Cloudflare AI parses GCal changes intelligently
4. Availability API respects GCal busy times
5. WhatsApp wa.me link shown in chatbot after booking confirmed

## Architecture

```
Client Books (chatbot or website)
         │
         ▼
   DB: createBooking()
         │
         ├──► Google Calendar: createEvent()  ◄── Owner edits on phone
         │         │                                      │
         │    stores google_event_id            Google pushes webhook
         │                                              │
         │                              /api/calendar/webhook
         │                                              │
         │                              Cloudflare AI analyzes change
         │                                              │
         │                    ┌────────────┬────────────┐
         │                 moved?      cancelled?    renamed?
         │                    │            │             │
         │               update DB    cancel DB     update DB
         │
         └──► WhatsApp wa.me link shown in chatbot
```

## Calendar Credentials

Single shared salon calendar. Credentials stored in `wrangler.toml` vars:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_WEBHOOK_SECRET` (new — for verifying webhook authenticity)

## Files Changed

| File | Type | Change |
|---|---|---|
| `functions/api/bookings.ts` | Fix | Add `db` param, push GCal on create/cancel |
| `functions/api/availability.ts` | Fix | Add `db` param, include GCal busy slots |
| `functions/api/calendar/sync.ts` | Fix | Add `db` param, use real `calendar-ai.ts` |
| `functions/api/calendar/webhook.ts` | New | Receive GCal push notifications, run AI, update DB |
| `functions/api/calendar/register.ts` | New | One-time endpoint to register webhook channel with Google |
| `lib/calendar-ai.ts` | New | AI functions: analyzeEvent, analyzeEventChange, suggestAlternativeSlots |
| `functions/api/chat.ts` | Fix | After booking → push GCal + return WhatsApp link in response |
| `migrations/0005_sync_token.sql` | New | Store webhook channelId, resourceId, syncToken in global_settings |

## Data Flow: Outbound (DB → GCal)

**On booking create** (`bookings.ts` POST and `chat.ts` POST):
1. `createBooking(db, ...)` → booking saved to D1
2. `gcal.createEvent(booking, serviceName, stylistName)` → GCal event created
3. Store returned `google_event_id` on the booking record via `updateBooking(db, id, { google_event_id })`

**On booking cancel** (`bookings.ts` PATCH status=cancelled):
1. `updateBookingStatus(db, id, 'cancelled')`
2. `gcal.deleteEvent(booking.id)` → GCal event removed

## Data Flow: Inbound (GCal → DB via Webhook)

**One-time setup** (`GET /api/calendar/register`):
1. Call `gcal.watchCalendar(webhookUrl)` with the webhook endpoint URL
2. Store returned `channelId` and `resourceId` in `global_settings`
3. Must be re-registered every 7 days (Google maximum)

**On each phone change** (`POST /api/calendar/webhook`):
1. Google sends `X-Goog-Channel-Id` header — verify against stored channelId
2. Fetch updated events using Calendar API with stored `syncToken`
3. Update `syncToken` in global_settings after each sync
4. For each changed event, call Cloudflare AI `analyzeEventChange(event, env, db)`
5. AI determines: time moved / cancelled / renamed / new external event
6. Update DB accordingly

## lib/calendar-ai.ts Functions

```typescript
// Parse an event summary+description to extract booking details
analyzeEvent(summary, description, env): Promise<AIEventAnalysis | null>

// Understand what changed in an updated GCal event
analyzeEventChange(event, db, env): Promise<void>
// - If time moved: updateBookingTime(db, bookingId, newStart, newEnd)
// - If cancelled: updateBookingStatus(db, bookingId, 'cancelled')
// - If new booking-like event: createBooking(db, ...)

// Suggest best 3 alternative slots when conflict detected
suggestAlternativeSlots(bookingDetails, availableSlots, env): Promise<string>
```

## Availability Fix

`availability.ts` currently ignores GCal. After fix:
1. Fetch GCal busy slots for the requested date via `gcal.getBusySlots(date)`
2. Pass as `blockedRanges` to `generateSlotsForStylist()`
3. This ensures owner blocking time on his phone immediately removes those slots from chatbot offers

## WhatsApp Notification (Chatbot)

After chatbot booking confirmed:
1. Fetch salon owner's WhatsApp number from `global_settings` key `owner_whatsapp`
2. Generate `wa.me` link with pre-filled booking summary message
3. Include the link in the AI response: chatbot tells client "Tap here to notify us on WhatsApp: [link]"
4. This opens WhatsApp from the client's own phone, pre-filled to send to the owner

## Database Migration

```sql
-- 0005_sync_token.sql
-- Webhook channel tracking stored in existing global_settings table
-- Keys: 'gcal_channel_id', 'gcal_resource_id', 'gcal_sync_token', 'owner_whatsapp'
-- No new table needed
```

## Non-Goals

- Per-stylist individual Google Calendars (owner preferred one shared calendar)
- Automated WhatsApp Business API (wa.me link is sufficient)
- SMS notifications
- Email confirmations

## Success Criteria

- Booking created anywhere → GCal event appears within 5 seconds
- Owner moves event on phone → DB reflects new time within 5 seconds
- Owner cancels event on phone → booking marked cancelled in DB
- Availability slots never include times the owner has blocked in GCal
- Chatbot shows WhatsApp link after confirming booking
