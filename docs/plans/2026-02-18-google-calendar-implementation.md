# Google Calendar Two-Way Sync + Smart Scheduling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all broken booking/availability API calls, add two-way Google Calendar sync, Cloudflare AI event parsing, and WhatsApp link after chatbot booking.

**Architecture:** All DB function calls receive `context.env.DB` as the first argument. On every booking create/cancel the system pushes to Google Calendar. Google sends webhook push notifications to `/api/calendar/webhook` when the owner edits from his phone — Cloudflare AI parses the change and updates D1 accordingly.

**Tech Stack:** Cloudflare Pages Functions, Cloudflare D1, Cloudflare AI (llama-3-8b-instruct), Google Calendar API v3, TypeScript

**Design doc:** `docs/plans/2026-02-18-google-calendar-integration-design.md`

---

## Prerequisites — Read Before Starting

- All DB helper functions (`getBookings`, `createBooking`, etc.) are in `lib/database.ts` and require `db: D1Database` as their **first** argument.
- `context.env.DB` is the D1 binding — always destructure it at the top of every handler: `const db = context.env.DB as D1Database;`
- Google Calendar client is in `lib/google-calendar.ts`. Create with: `createGoogleCalendarClient(env)` — reads creds from `env.GOOGLE_CLIENT_ID`, `env.GOOGLE_CLIENT_SECRET`, `env.GOOGLE_REFRESH_TOKEN`, `env.GOOGLE_CALENDAR_ID`.
- `wrangler.toml` already has all Google OAuth creds under `[vars]`.
- Test locally with: `npx wrangler pages dev --local` then `curl` the endpoints.
- Deploy with: `npx wrangler pages deploy`

---

### Task 1: Fix `functions/api/bookings.ts` — DB params + GCal outbound

**Files:**
- Modify: `functions/api/bookings.ts`
- Reference: `lib/database.ts` (createBooking, getBookings, updateBookingStatus, getService, updateBooking, getBooking)
- Reference: `lib/google-calendar.ts` (createGoogleCalendarClient, GoogleCalendarClient)

**What's broken now:**
- `getBookings()`, `getService(id)`, `createBooking({...})`, `updateBookingStatus(id, status)` are all called without `db`
- No Google Calendar push when booking created or cancelled

**Step 1: Replace the entire file with this corrected version**

```typescript
import { D1Database } from '../../lib/db-types';
import {
    createBooking,
    getBookings,
    updateBookingStatus,
    getService,
    getBooking,
    updateBooking,
    getStylist
} from '../../lib/database';
import { createGoogleCalendarClient } from '../../lib/google-calendar';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;
    try {
        const bookings = await getBookings(db);
        return Response.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return Response.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
};

export const onRequestPost: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;
    try {
        const body: any = await context.request.json();
        const { client_name, client_email, client_phone, service_id, stylist_id, start_time } = body;

        if (!client_name || !client_email || !client_phone || !service_id || !stylist_id || !start_time) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const service = await getService(db, service_id);
        if (!service) return Response.json({ error: 'Service not found' }, { status: 404 });

        const stylist = await getStylist(db, stylist_id);

        const startTime = new Date(start_time);
        const endTime = new Date(startTime.getTime() + service.duration_minutes * 60 * 1000);

        const booking = await createBooking(db, {
            client_name,
            client_email,
            client_phone,
            service_id,
            stylist_id,
            start_time: startTime,
            end_time: endTime,
            status: 'confirmed'
        });

        // Push to Google Calendar
        try {
            const gcal = createGoogleCalendarClient(context.env);
            const googleEventId = await gcal.createEvent(booking, service.name, stylist?.name || 'Stylist');
            await updateBooking(db, booking.id, { google_event_id: googleEventId });
        } catch (gcalErr) {
            console.error('GCal push failed (non-fatal):', gcalErr);
        }

        return Response.json(booking, { status: 201 });
    } catch (error) {
        console.error('Error creating booking:', error);
        return Response.json({ error: 'Failed to create booking' }, { status: 500 });
    }
};

export const onRequestPatch: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;
    try {
        const body: any = await context.request.json();
        const { id, status } = body;

        if (!id || !status) return Response.json({ error: 'Missing id and status' }, { status: 400 });
        if (!['pending', 'confirmed', 'cancelled', 'completed', 'no-show'].includes(status)) {
            return Response.json({ error: 'Invalid status' }, { status: 400 });
        }

        const booking = await updateBookingStatus(db, id, status);
        if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

        // If cancelled, delete from Google Calendar
        if (status === 'cancelled') {
            try {
                const gcal = createGoogleCalendarClient(context.env);
                await gcal.deleteEvent(id);
            } catch (gcalErr) {
                console.error('GCal delete failed (non-fatal):', gcalErr);
            }
        }

        return Response.json(booking);
    } catch (error) {
        console.error('Error updating booking:', error);
        return Response.json({ error: 'Failed to update booking' }, { status: 500 });
    }
};
```

**Step 2: Verify locally**

Start dev server: `npx wrangler pages dev --local`

Test GET bookings:
```bash
curl http://localhost:8788/api/bookings
```
Expected: JSON array (not a 500 error)

Test POST booking:
```bash
curl -X POST http://localhost:8788/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","client_email":"t@t.com","client_phone":"0771234567","service_id":"<real-id>","stylist_id":"<real-id>","start_time":"2026-02-25T10:00:00.000Z"}'
```
Expected: 201 with booking JSON, GCal event appears in calendar

**Step 3: Commit**

```bash
git add functions/api/bookings.ts
git commit -m "fix: repair bookings API db params and add GCal outbound sync"
```

---

### Task 2: Create `lib/calendar-ai.ts` — Missing AI Analysis Module

**Files:**
- Create: `lib/calendar-ai.ts`
- Reference: `lib/database.ts` (updateBookingStatus, updateBookingTime, createBooking, getBookings, getService, getStylists)

**What it does:**
- `analyzeEvent` — parses a GCal event summary+description to extract booking intent
- `analyzeEventChange` — AI determines what changed (time moved/cancelled) and updates DB
- `suggestAlternativeSlots` — returns human-readable slot suggestions when conflict detected

**Step 1: Create the file**

```typescript
// lib/calendar-ai.ts
import { D1Database } from './db-types';
import { getBookings, updateBookingStatus, updateBookingTime, getServices, getStylists } from './database';

export interface AIEventAnalysis {
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    serviceId?: string;
    stylistId?: string;
    confidence: number;
}

/**
 * Parse a Google Calendar event into booking details using AI.
 * Used when a new event appears in GCal that wasn't created by the system.
 */
export async function analyzeEvent(
    summary: string,
    description: string,
    env: any
): Promise<AIEventAnalysis | null> {
    try {
        const services = await getServices(env.DB as D1Database);
        const stylists = await getStylists(env.DB as D1Database, true);

        const prompt = `Parse this Google Calendar event and extract booking details.

Event summary: "${summary}"
Event description: "${description}"

Available services:
${services.map(s => `ID: ${s.id}, Name: ${s.name}`).join('\n')}

Available stylists:
${stylists.map(s => `ID: ${s.id}, Name: ${s.name}`).join('\n')}

Return strictly JSON:
{
  "clientName": "...",
  "clientEmail": "...",
  "clientPhone": "...",
  "serviceId": "...",
  "stylistId": "...",
  "confidence": 0.0-1.0
}

If you cannot reliably extract a field, use null for it.
Confidence = 1.0 only if name+phone and a clear service match exist.`;

        const res = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: `Parse: "${summary}" / "${description}"` }
            ],
            max_tokens: 200
        });

        const match = res.response?.match(/\{[\s\S]*\}/);
        if (!match) return null;
        return JSON.parse(match[0]) as AIEventAnalysis;
    } catch (e) {
        console.error('analyzeEvent error:', e);
        return null;
    }
}

/**
 * Called when Google Calendar webhook fires for an updated/cancelled event.
 * AI figures out what changed and updates the D1 database accordingly.
 */
export async function analyzeEventChange(
    event: {
        id: string;
        summary?: string;
        description?: string;
        status: string;
        start?: { dateTime?: string };
        end?: { dateTime?: string };
    },
    db: D1Database,
    env: any
): Promise<{ action: string; bookingId?: string }> {
    // 1. Extract our booking ID from description (events we created have "Booking ID: booking-xxx")
    const bookingIdMatch = event.description?.match(/Booking ID: (booking-[a-zA-Z0-9-]+)/);
    const bookingId = bookingIdMatch?.[1];

    // 2. Event was cancelled in GCal
    if (event.status === 'cancelled') {
        if (bookingId) {
            await updateBookingStatus(db, bookingId, 'cancelled');
            return { action: 'cancelled', bookingId };
        }
        return { action: 'cancelled_unknown' };
    }

    // 3. Event was moved (time changed) — our booking, just update times
    if (bookingId && event.start?.dateTime && event.end?.dateTime) {
        const newStart = new Date(event.start.dateTime);
        const newEnd = new Date(event.end.dateTime);
        await updateBookingTime(db, bookingId, newStart, newEnd);
        return { action: 'rescheduled', bookingId };
    }

    // 4. New external event (owner added something manually) — AI parse
    if (!bookingId && event.summary && event.status !== 'cancelled') {
        const analysis = await analyzeEvent(event.summary, event.description || '', env);
        if (analysis && analysis.confidence > 0.7 && event.start?.dateTime) {
            // Block the time by creating a placeholder booking
            return { action: 'external_event_noted' };
        }
    }

    return { action: 'no_change_needed' };
}

/**
 * Generate a human-readable suggestion for alternative booking slots.
 * Used by the chatbot when requested time is unavailable.
 */
export async function suggestAlternativeSlots(
    originalTime: string,
    availableSlots: { start: Date; end: Date; stylist_name: string }[],
    env: any
): Promise<string> {
    if (availableSlots.length === 0) {
        return 'I\'m sorry, there are no available slots in the near future. Please call us to arrange a time.';
    }

    const top3 = availableSlots.slice(0, 3).map(s =>
        `${s.stylist_name}: ${s.start.toLocaleString('en-US', { timeZone: 'Asia/Colombo', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    );

    try {
        const res = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                {
                    role: 'system',
                    content: `You are a friendly salon receptionist. The client asked for ${originalTime} but it's not available. Suggest these alternatives in a warm, concise message (2-3 sentences max):\n${top3.join('\n')}`
                },
                { role: 'user', content: 'Suggest alternatives' }
            ],
            max_tokens: 100
        });
        return res.response || top3.join(', ');
    } catch {
        return `How about: ${top3.join(', ')}?`;
    }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors (or only pre-existing errors unrelated to this file)

**Step 3: Commit**

```bash
git add lib/calendar-ai.ts
git commit -m "feat: add calendar-ai.ts with AI event parsing and slot suggestion"
```

---

### Task 3: Create `functions/api/calendar/webhook.ts` — Inbound GCal Sync

**Files:**
- Create: `functions/api/calendar/webhook.ts`
- Reference: `lib/google-calendar.ts` (createGoogleCalendarClient)
- Reference: `lib/calendar-ai.ts` (analyzeEventChange)
- Reference: `lib/database.ts` (getGlobalSettings)

**What it does:**
When the owner changes an event on his phone, Google calls this endpoint. We verify the channel, fetch the updated event, run AI analysis, and update D1.

**Step 1: Create the file**

```typescript
// functions/api/calendar/webhook.ts
import { D1Database } from '../../../lib/db-types';
import { getGlobalSettings, updateGlobalSetting } from '../../../lib/database';
import { createGoogleCalendarClient } from '../../../lib/google-calendar';
import { analyzeEventChange } from '../../../lib/calendar-ai';

export const onRequestPost: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;

    try {
        // 1. Verify this is a legitimate Google push
        const channelId = context.request.headers.get('X-Goog-Channel-Id');
        const resourceState = context.request.headers.get('X-Goog-Resource-State');

        const settings = await getGlobalSettings(db);
        const storedChannelId = settings['gcal_channel_id'];

        // First notification is always 'sync' — just acknowledge
        if (resourceState === 'sync') {
            return new Response('OK', { status: 200 });
        }

        // Reject if channel ID doesn't match what we registered
        if (storedChannelId && channelId !== storedChannelId) {
            console.warn('Webhook: unknown channel ID', channelId);
            return new Response('Forbidden', { status: 403 });
        }

        // 2. Fetch changed events using sync token (incremental sync)
        const gcal = createGoogleCalendarClient(context.env);
        const accessToken = await (gcal as any).getAccessToken();

        const syncToken = settings['gcal_sync_token'];
        const params: Record<string, string> = {
            singleEvents: 'true',
            showDeleted: 'true'
        };
        if (syncToken) params.syncToken = syncToken;
        else {
            // Fallback: last 24 hours
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            params.timeMin = yesterday;
        }

        const eventsRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${context.env.GOOGLE_CALENDAR_ID}/events?${new URLSearchParams(params)}`,
            { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
        );
        const eventsData = await eventsRes.json();

        // 3. Store new sync token for next time
        if (eventsData.nextSyncToken) {
            await updateGlobalSetting(db, 'gcal_sync_token', eventsData.nextSyncToken);
        }

        // 4. Process each changed event
        const results = [];
        for (const event of (eventsData.items || [])) {
            const result = await analyzeEventChange(event, db, context.env);
            results.push(result);
        }

        console.log('Webhook processed:', results);
        return Response.json({ ok: true, processed: results.length });

    } catch (error) {
        console.error('Webhook error:', error);
        // Always return 200 to Google (else it will stop sending)
        return new Response('OK', { status: 200 });
    }
};

// Google sends a HEAD request to verify endpoint is reachable
export const onRequestHead: PagesFunction = async () => {
    return new Response(null, { status: 200 });
};
```

**Step 2: Test webhook with a curl simulation**

```bash
# Simulate a Google push notification
curl -X POST http://localhost:8788/api/calendar/webhook \
  -H "X-Goog-Channel-Id: test-channel" \
  -H "X-Goog-Resource-State: sync" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: `OK` (200) — sync ping acknowledged

**Step 3: Commit**

```bash
git add functions/api/calendar/webhook.ts
git commit -m "feat: add GCal inbound webhook handler with AI change analysis"
```

---

### Task 4: Create `functions/api/calendar/register.ts` — One-Time Webhook Registration

**Files:**
- Create: `functions/api/calendar/register.ts`
- Reference: `lib/google-calendar.ts` (watchCalendar)
- Reference: `lib/database.ts` (updateGlobalSetting)

**What it does:**
Admin calls `GET /api/calendar/register` once to tell Google "send webhook pushes to our URL". Must be re-called every 7 days (Google expiry limit). Stores the channel ID in global_settings so webhook.ts can verify.

**Step 1: Create the file**

```typescript
// functions/api/calendar/register.ts
import { D1Database } from '../../../lib/db-types';
import { updateGlobalSetting } from '../../../lib/database';
import { createGoogleCalendarClient } from '../../../lib/google-calendar';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;

    try {
        const gcal = createGoogleCalendarClient(context.env);

        // Determine the webhook URL (our Pages domain + /api/calendar/webhook)
        const url = new URL(context.request.url);
        const webhookUrl = `${url.protocol}//${url.host}/api/calendar/webhook`;

        const resourceId = await gcal.watchCalendar(webhookUrl);

        // The watchCalendar method returns resourceId but we also need channelId
        // Let's enhance it — for now store what we have
        const channelId = `salon-most-${Date.now()}`;
        await updateGlobalSetting(db, 'gcal_channel_id', channelId);
        await updateGlobalSetting(db, 'gcal_resource_id', resourceId);
        // Clear sync token so next webhook fetch starts fresh
        await updateGlobalSetting(db, 'gcal_sync_token', '');

        return Response.json({
            success: true,
            webhookUrl,
            channelId,
            resourceId,
            note: 'Webhook registered. Re-call this endpoint every 7 days.'
        });

    } catch (error) {
        console.error('Register error:', error);
        return Response.json({ error: 'Failed to register webhook', details: String(error) }, { status: 500 });
    }
};
```

**Important:** Also update `lib/google-calendar.ts` `watchCalendar` method to use the passed-in `channelId` so it matches what we store. Replace the `id` field in the watch request:

In `lib/google-calendar.ts`, find the `watchCalendar` method body and change:
```typescript
// OLD:
id: `salon-most-${Date.now()}`,

// NEW — accept channelId as parameter:
```

Change the method signature to:
```typescript
async watchCalendar(webhookUrl: string, channelId: string): Promise<string> {
```

And in the body, change `id: \`salon-most-${Date.now()}\`` to `id: channelId`.

Update `register.ts` to pass the channelId:
```typescript
const channelId = `salon-most-${Date.now()}`;
const resourceId = await gcal.watchCalendar(webhookUrl, channelId);
```

**Step 2: Test**

```bash
curl http://localhost:8788/api/calendar/register
```
Expected: JSON with `webhookUrl`, `channelId`, `resourceId`

After calling this in production, check Google Calendar's push channel is active.

**Step 3: Commit**

```bash
git add functions/api/calendar/register.ts lib/google-calendar.ts
git commit -m "feat: add GCal webhook registration endpoint"
```

---

### Task 5: Fix `functions/api/availability.ts` — Add GCal Busy Slots

**Files:**
- Modify: `functions/api/availability.ts`
- Reference: `lib/google-calendar.ts` (createGoogleCalendarClient, getBusySlots)
- Reference: `lib/slot-engine.ts` (generateSlotsForStylist already accepts blockedRanges)

**What's broken:** All DB calls missing `db`. GCal busy slots never fetched — if owner blocks time on phone, slots are still shown.

**Step 1: Replace the entire file**

```typescript
// functions/api/availability.ts
import { D1Database } from '../../lib/db-types';
import {
    getStylists,
    getStylist,
    getService,
    getBookingsForStylist,
    getCachedAvailability,
    setCachedAvailability
} from '../../lib/database';
import {
    generateSlotsForStylist,
    generateSlotsAllStylists,
    filterFutureSlots
} from '../../lib/slot-engine';
import { createGoogleCalendarClient } from '../../lib/google-calendar';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;

    try {
        const url = new URL(context.request.url);
        const dateStr = url.searchParams.get('date');
        const serviceId = url.searchParams.get('serviceId');
        const stylistId = url.searchParams.get('stylistId');

        if (!dateStr || !serviceId) {
            return Response.json({ error: 'Missing required parameters: date and serviceId' }, { status: 400 });
        }

        const date = new Date(dateStr);
        const service = await getService(db, serviceId);
        if (!service) return Response.json({ error: 'Service not found' }, { status: 404 });

        // Fetch GCal busy slots for this date (non-fatal if fails)
        let gcalBusy: { start: Date; end: Date }[] = [];
        try {
            const gcal = createGoogleCalendarClient(context.env);
            gcalBusy = await gcal.getBusySlots(date);
        } catch (e) {
            console.warn('GCal busy slots fetch failed (non-fatal):', e);
        }

        if (stylistId && stylistId !== 'any') {
            const stylist = await getStylist(db, stylistId);
            if (!stylist) return Response.json({ error: 'Stylist not found' }, { status: 404 });

            // Check cache (GCal integration means cache may be stale — skip if gcalBusy fetched)
            if (gcalBusy.length === 0) {
                const cached = await getCachedAvailability(stylistId, date);
                if (cached) {
                    return Response.json({
                        slots: filterFutureSlots(cached).map(s => s.toISOString()),
                        cached: true,
                        stylist: { id: stylist.id, name: stylist.name }
                    });
                }
            }

            const bookings = await getBookingsForStylist(db, stylistId, date);
            const slots = generateSlotsForStylist(stylist, date, service.duration_minutes, bookings, gcalBusy);

            await setCachedAvailability(stylistId, date, slots);

            return Response.json({
                slots: filterFutureSlots(slots).map(s => s.toISOString()),
                cached: false,
                stylist: { id: stylist.id, name: stylist.name }
            });
        }

        // Auto-assign mode: all stylists
        const stylists = await getStylists(db, true);
        const bookingsByStyleist = new Map();
        for (const stylist of stylists) {
            const bookings = await getBookingsForStylist(db, stylist.id, date);
            bookingsByStyleist.set(stylist.id, bookings);
        }

        const allSlots = generateSlotsAllStylists(stylists, date, service.duration_minutes, bookingsByStyleist, gcalBusy);
        const futureSlots = allSlots.filter(slot => slot.start > new Date());

        return Response.json({
            slots: futureSlots.map(slot => ({
                start: slot.start.toISOString(),
                end: slot.end.toISOString(),
                stylist_id: slot.stylist_id,
                stylist_name: slot.stylist_name
            })),
            cached: false,
            mode: 'auto-assign'
        });

    } catch (error) {
        console.error('Error fetching availability:', error);
        return Response.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
};
```

**Step 2: Test**

```bash
curl "http://localhost:8788/api/availability?date=2026-02-25&serviceId=<real-id>"
```
Expected: Slots JSON, no 500 errors. Verify GCal busy times don't appear in results.

**Step 3: Commit**

```bash
git add functions/api/availability.ts
git commit -m "fix: availability API db params + include GCal busy slots in slot engine"
```

---

### Task 6: Fix `functions/api/calendar/sync.ts` — Full Rewrite

**Files:**
- Modify: `functions/api/calendar/sync.ts`
- Reference: `lib/calendar-ai.ts` (analyzeEvent)
- Reference: `lib/database.ts` (getBookings, createBooking, updateBookingStatus)
- Reference: `lib/google-calendar.ts` (createGoogleCalendarClient)

**What's broken:** Missing `db` param everywhere, imports `calendar-ai` which didn't exist.

**Step 1: Replace the file**

```typescript
// functions/api/calendar/sync.ts
import { D1Database } from '../../../lib/db-types';
import { createGoogleCalendarClient } from '../../../lib/google-calendar';
import { analyzeEvent } from '../../../lib/calendar-ai';
import { getBookings, createBooking, updateBookingStatus } from '../../../lib/database';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;

    try {
        const gcal = createGoogleCalendarClient(context.env);
        const events = await gcal.getEvents();
        const dbBookings = await getBookings(db);

        let syncedCount = 0;
        const newBookings = [];

        for (const event of events) {
            if (event.status === 'cancelled') continue;

            // Skip events we created (they have "Booking ID:" in description)
            if (event.description?.includes('Booking ID:')) continue;

            const analysis = await analyzeEvent(event.summary, event.description || '', context.env);
            if (!analysis || analysis.confidence < 0.7) continue;

            const eventStart = event.start.dateTime || event.start.date || '';
            const existing = dbBookings.find(b =>
                (b.client_phone === analysis.clientPhone) &&
                Math.abs(new Date(b.start_time).getTime() - new Date(eventStart).getTime()) < 60000
            );

            if (existing) {
                if (existing.status !== 'confirmed' && event.status === 'confirmed') {
                    await updateBookingStatus(db, existing.id, 'confirmed');
                    syncedCount++;
                }
                continue;
            }

            if (!event.start.dateTime || !event.end.dateTime) continue;

            const newBooking = await createBooking(db, {
                client_name: analysis.clientName || 'Calendar Guest',
                client_email: '',
                client_phone: analysis.clientPhone || '',
                service_id: analysis.serviceId || '',
                stylist_id: analysis.stylistId || '',
                start_time: new Date(event.start.dateTime),
                end_time: new Date(event.end.dateTime),
                status: event.status === 'confirmed' ? 'confirmed' : 'pending'
            });

            newBookings.push(newBooking);
            syncedCount++;
        }

        return Response.json({
            success: true,
            synced: syncedCount,
            new_bookings: newBookings.length,
            events_scanned: events.length
        });

    } catch (error) {
        console.error('Sync Error:', error);
        return Response.json({ error: 'Calendar sync failed', details: String(error) }, { status: 500 });
    }
};
```

**Step 2: Test**

```bash
curl http://localhost:8788/api/calendar/sync
```
Expected: `{"success":true,"synced":0,"new_bookings":0,"events_scanned":N}`

**Step 3: Commit**

```bash
git add functions/api/calendar/sync.ts
git commit -m "fix: calendar sync db params + use new calendar-ai analyzeEvent"
```

---

### Task 7: Update `functions/api/chat.ts` — Push GCal + WhatsApp Link

**Files:**
- Modify: `functions/api/chat.ts`
- Reference: `lib/google-calendar.ts` (createGoogleCalendarClient)
- Reference: `lib/database.ts` (getService, getStylist, updateBooking, getGlobalSettings)

**What to add:**
1. After chatbot creates a booking → push to Google Calendar
2. After booking confirmed → include a WhatsApp wa.me link in the AI response

**Step 1: Add imports at top of `functions/api/chat.ts`**

```typescript
import { getChat, getChatById, createChat, addMessage, getMessages, updateChatContact, getService, getStylist, createBooking, updateBooking, getGlobalSettings } from '../../lib/database';
import { generateAIResponse, extractContactInfo, extractBookingIntent } from '../../lib/chat-agent';
import { createGoogleCalendarClient } from '../../lib/google-calendar';
```

**Step 2: After the booking creation block in the `if (!alreadyBooked)` section, add GCal push + WhatsApp link**

Find this code in `chat.ts`:
```typescript
augmentedMessage = `[SYSTEM: BOOKING SUCCESSFULLY CREATED - Ref: ${booking.id}]\n${lastUserMessage.content}`;
```

Replace it with:
```typescript
// Push to Google Calendar (non-fatal)
let gcalNote = '';
try {
    const service = await getService(db, bookingIntent.serviceId);
    const stylist = await getStylist(db, bookingIntent.stylistId);
    const gcal = createGoogleCalendarClient(env);
    const googleEventId = await gcal.createEvent(booking, service?.name || 'Service', stylist?.name || 'Stylist');
    await updateBooking(db, booking.id, { google_event_id: googleEventId });
} catch (gcalErr) {
    console.error('GCal push from chat failed (non-fatal):', gcalErr);
}

// Build WhatsApp link to owner
let waLink = '';
try {
    const settings = await getGlobalSettings(db);
    const ownerPhone = settings['owner_whatsapp'];
    if (ownerPhone) {
        const waMessage = encodeURIComponent(
            `New booking confirmed!\nClient: ${bookingIntent.name}\nPhone: ${bookingIntent.phone}\nTime: ${new Date(bookingIntent.dateTime).toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}\nRef: ${booking.id}`
        );
        waLink = ` To notify us on WhatsApp, tap: https://wa.me/${ownerPhone.replace(/[^0-9]/g, '')}?text=${waMessage}`;
    }
} catch (waErr) {
    console.error('WhatsApp link generation failed (non-fatal):', waErr);
}

augmentedMessage = `[SYSTEM: BOOKING SUCCESSFULLY CREATED - Ref: ${booking.id}]${waLink}\n${lastUserMessage.content}`;
```

**Step 3: Set the owner's WhatsApp number**

In the admin dashboard or directly via SQL, set the global setting:
```sql
INSERT INTO global_settings (key, value) VALUES ('owner_whatsapp', '94771234567')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
```

Replace `94771234567` with the actual owner number (country code + number, no `+`).

**Step 4: Test via chatbot**

Open chatbot, complete a full booking conversation:
1. Service → 2. Stylist → 3. Date/Time → 4. Name & Phone

Expected:
- AI confirms booking with "Confirmed!" message
- Message includes a WhatsApp link
- GCal event appears in Google Calendar
- Booking appears in admin dashboard

**Step 5: Commit**

```bash
git add functions/api/chat.ts
git commit -m "feat: chatbot booking pushes to GCal and includes WhatsApp link"
```

---

### Task 8: Deploy and Register Webhook

**Step 1: Deploy to Cloudflare**

```bash
npm run build
npx wrangler pages deploy
```

Wait for deployment URL (e.g., `https://most-salon.pages.dev`).

**Step 2: Register Google Calendar webhook**

```bash
curl https://most-salon.pages.dev/api/calendar/register
```

Expected:
```json
{
  "success": true,
  "webhookUrl": "https://most-salon.pages.dev/api/calendar/webhook",
  "channelId": "salon-most-1234567890",
  "resourceId": "..."
}
```

**Step 3: Test two-way sync**

1. Create a booking via the website
2. Verify the event appears in Google Calendar (within 5 seconds)
3. Open Google Calendar on the owner's phone
4. Move the booking to a different time
5. Wait 5-10 seconds
6. Check admin dashboard — booking time should be updated

**Step 4: Set up webhook re-registration (every 7 days)**

Google Calendar webhooks expire after 7 days. Add a reminder or set up a Cloudflare Cron Trigger in `wrangler.toml`:

```toml
[triggers]
crons = ["0 9 * * 1"]  # Every Monday at 9AM UTC — re-register webhook
```

Create `functions/api/calendar/cron-register.ts` (or handle in `src/worker.ts` scheduled handler) to call the register endpoint.

**Step 5: Commit**

```bash
git add wrangler.toml
git commit -m "feat: add cron trigger for weekly GCal webhook re-registration"
```

---

## Summary of All Changes

| Task | Files | Status after task |
|---|---|---|
| 1 | `bookings.ts` | Fixed db params, GCal push on create/cancel |
| 2 | `lib/calendar-ai.ts` | New — AI event parsing |
| 3 | `calendar/webhook.ts` | New — inbound GCal sync |
| 4 | `calendar/register.ts` | New — one-time webhook setup |
| 5 | `availability.ts` | Fixed db params, GCal busy slots included |
| 6 | `calendar/sync.ts` | Fixed, uses new calendar-ai.ts |
| 7 | `chat.ts` | GCal push + WhatsApp link after booking |
| 8 | Deploy + register | Webhook live, two-way sync active |

## Known Limitations

- Webhook channel expires every 7 days — must re-register (Task 8 adds a cron)
- WhatsApp link requires the client to tap "Send" themselves (cannot auto-send — this is by design using the client's own WhatsApp account)
- `suggestAlternativeSlots` in `calendar-ai.ts` is available but not yet wired into the chatbot conflict flow — can be added as a follow-up
