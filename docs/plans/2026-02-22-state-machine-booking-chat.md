# State-Machine Booking Chat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the unreliable LLM-extraction booking flow with a deterministic state machine that guides users step-by-step, never re-asks answered questions, checks availability before collecting contact info, and creates the booking + GCal event reliably.

**Architecture:** A `BookingState` JSON object is stored per-chat in the `chats` table. On each user message, the state machine reads the current step, uses NLP helpers to extract only the needed piece of data from the user's message, validates it, and advances to the next step. The LLM (`llama-3-8b-instruct`) is used only for narrow NLP tasks (extract a service name, parse a date), not for extracting everything at once. The main chat response is generated deterministically from state, not by LLM.

**Tech Stack:** Cloudflare Workers, D1 (SQLite), `@cf/meta/llama-3-8b-instruct` for NLP helpers, TypeScript

---

## State Machine Overview

```
ask_service → ask_stylist → ask_date → ask_time
                                           ↓
                                   [check availability]
                                     ↓         ↓
                                AVAILABLE   NOT AVAILABLE
                                     ↓         ↓
                              ask_name_phone  retry_count++
                                     ↓         ↓
                                  confirm   (max 3 retries → ask new date)
                                     ↓
                                  complete
```

**State object shape:**
```ts
interface BookingState {
  step: 'ask_service' | 'ask_stylist' | 'ask_date' | 'ask_time'
      | 'ask_name_phone' | 'confirm' | 'complete';
  service_id?: string;
  service_name?: string;
  service_duration?: number;
  stylist_id?: string;       // 'any' = auto-assign
  stylist_name?: string;
  date?: string;             // YYYY-MM-DD
  time?: string;             // HH:MM (24h)
  retry_count?: number;
  name?: string;
  phone?: string;
}
```

---

## Task 1: DB Migration — add `booking_state` column

**Files:**
- Create: `migrations/0005_booking_state.sql`
- Modify: `lib/database.ts` (add `getBookingState`, `setBookingState`)
- Modify: `lib/db-types.ts` (add `booking_state` field to `Chat`)

### Step 1: Create migration file

```sql
-- migrations/0005_booking_state.sql
ALTER TABLE chats ADD COLUMN booking_state TEXT DEFAULT NULL;
```

### Step 2: Apply migration locally

```bash
npx wrangler d1 execute most-salon-db --local --file=migrations/0005_booking_state.sql
```
Expected: `Successfully applied migration`

### Step 3: Add helper functions to `lib/database.ts`

Find the `updateChatContact` function. Add these two functions right after it:

```ts
export async function getBookingState(db: D1Database, chatId: string): Promise<any | null> {
    const row: any = await db.prepare('SELECT booking_state FROM chats WHERE id = ?').bind(chatId).first();
    if (!row?.booking_state) return null;
    try { return JSON.parse(row.booking_state); } catch { return null; }
}

export async function setBookingState(db: D1Database, chatId: string, state: any): Promise<void> {
    await db.prepare('UPDATE chats SET booking_state = ? WHERE id = ?')
        .bind(JSON.stringify(state), chatId).run();
}
```

### Step 4: Add `booking_state` to Chat type in `lib/db-types.ts`

Find the `Chat` interface and add the field:
```ts
booking_state?: string | null;
```

### Step 5: Commit

```bash
git add migrations/0005_booking_state.sql lib/database.ts lib/db-types.ts
git commit -m "feat: add booking_state column for chat state machine"
```

---

## Task 2: NLP Helper Functions

**Files:**
- Modify: `lib/chat-agent.ts` (add NLP helpers, replace `extractBookingIntent`)

These helpers use the LLM for narrow, focused tasks only. Each returns a typed result or `null`.

### Step 1: Replace `extractBookingIntent` with narrow NLP helpers

In `lib/chat-agent.ts`, **delete** the entire `extractBookingIntent` function (lines ~137–190) and **replace** with these four helpers:

```ts
/** Extract which service the user wants. Returns matching service or null. */
export async function extractServiceFromMessage(
    message: string,
    services: { id: string; name: string }[],
    env: any
): Promise<{ id: string; name: string; duration: number } | null> {
    // Try fuzzy match first (no LLM cost)
    const lower = message.toLowerCase();
    const direct = (services as any[]).find(s => lower.includes(s.name.toLowerCase()));
    if (direct) return { id: direct.id, name: direct.name, duration: direct.duration_minutes };

    // LLM fallback
    try {
        const serviceList = services.map(s => `"${s.name}"`).join(', ');
        const res = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: `You are matching a client's message to a salon service. Services: ${serviceList}. Return ONLY the exact service name that best matches, or "none" if no match.` },
                { role: 'user', content: message }
            ],
            max_tokens: 30
        });
        const matched = res.response?.trim().replace(/^"|"$/g, '');
        const found = (services as any[]).find(s => s.name.toLowerCase() === matched?.toLowerCase());
        if (found) return { id: found.id, name: found.name, duration: found.duration_minutes };
    } catch {}
    return null;
}

/** Extract stylist preference. Returns stylist, 'any', or null if unclear. */
export async function extractStylistFromMessage(
    message: string,
    stylists: { id: string; name: string }[],
    env: any
): Promise<{ id: string; name: string } | 'any' | null> {
    const lower = message.toLowerCase();
    if (/\bany\b|doesn't matter|no preference|whoever|available/i.test(lower)) return 'any';

    const direct = stylists.find(s => lower.includes(s.name.toLowerCase().split(' ')[0]));
    if (direct) return { id: direct.id, name: direct.name };

    // LLM fallback
    try {
        const nameList = stylists.map(s => s.name).join(', ');
        const res = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: `Match to a stylist name from this list: ${nameList}. Return ONLY the exact name, "any", or "none".` },
                { role: 'user', content: message }
            ],
            max_tokens: 20
        });
        const matched = res.response?.trim();
        if (matched?.toLowerCase() === 'any') return 'any';
        const found = stylists.find(s => s.name.toLowerCase() === matched?.toLowerCase());
        if (found) return { id: found.id, name: found.name };
    } catch {}
    return null;
}

/** Parse a date from natural language. Returns YYYY-MM-DD or null. */
export async function parseDateFromMessage(
    message: string,
    env: any
): Promise<string | null> {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }); // YYYY-MM-DD
    try {
        const res = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: `Today is ${today} (Asia/Colombo). Extract the date the user mentions and return it as YYYY-MM-DD. Return ONLY the date string, nothing else. If no date, return "none".` },
                { role: 'user', content: message }
            ],
            max_tokens: 15
        });
        const result = res.response?.trim();
        if (result && /^\d{4}-\d{2}-\d{2}$/.test(result)) return result;
    } catch {}
    return null;
}

/** Parse a time from natural language. Returns HH:MM (24h) or null. */
export async function parseTimeFromMessage(
    message: string,
    env: any
): Promise<string | null> {
    try {
        const res = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: 'Extract the time from the user\'s message. Return ONLY HH:MM in 24-hour format (e.g. "14:30"). If no time, return "none".' },
                { role: 'user', content: message }
            ],
            max_tokens: 10
        });
        const result = res.response?.trim();
        if (result && /^\d{2}:\d{2}$/.test(result)) return result;
    } catch {}
    return null;
}

/** Extract name and phone from a message. */
export async function extractNamePhone(
    message: string,
    env: any
): Promise<{ name: string; phone: string } | null> {
    const phoneMatch = message.match(/(?:0|94|\+94)?7[0-9]{8}/);
    if (!phoneMatch) return null;

    try {
        const res = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: 'Extract the person\'s name and phone number. Return strictly JSON: {"name": "...", "phone": "..."}' },
                { role: 'user', content: message }
            ],
            max_tokens: 60
        });
        const jsonMatch = res.response?.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}

    return { name: 'Guest', phone: phoneMatch[0] };
}
```

### Step 2: Commit helpers

```bash
git add lib/chat-agent.ts
git commit -m "feat: add narrow NLP helpers for state machine"
```

---

## Task 3: Core State Machine Function

**Files:**
- Modify: `lib/chat-agent.ts` (add `runBookingStateMachine`)
- Modify: `lib/database.ts` (imports already added in Task 1)

### Step 1: Add imports at top of `lib/chat-agent.ts`

Add to existing imports:
```ts
import { getServices, getStylists, getBookingsForStylist, createBooking, updateBooking, getGlobalSettings } from './database';
import { createGoogleCalendarClient } from './google-calendar';
```

### Step 2: Add the state machine function after the NLP helpers

```ts
/**
 * Main state machine — called on every user message when AI mode is active.
 * Returns the bot's deterministic response text.
 */
export async function runBookingStateMachine(
    state: any,
    userMessage: string,
    env: any,
    db: D1Database
): Promise<{ response: string; newState: any }> {
    const services = await getServices(db);
    const stylists = await getStylists(db, true);

    // Initialize state for new conversations
    if (!state || !state.step) {
        state = { step: 'ask_service', retry_count: 0 };
    }

    let { step } = state;

    // ── Step: ask_service ──────────────────────────────────────────────────
    if (step === 'ask_service') {
        const service = await extractServiceFromMessage(userMessage, services, env);
        if (!service) {
            const serviceList = services.map(s => `${s.name} (${s.price} LKR)`).join(', ');
            return {
                response: `Welcome to The MOST! What service would you like today?\n\nOur services: ${serviceList}`,
                newState: state
            };
        }
        const newState = { ...state, step: 'ask_stylist', service_id: service.id, service_name: service.name, service_duration: service.duration };
        const stylistNames = stylists.map(s => s.name).join(', ');
        return {
            response: `Great choice — ${service.name}! Do you have a preferred stylist?\n\nOur team: ${stylistNames}\n\nOr just say "any" and I'll find whoever's free.`,
            newState
        };
    }

    // ── Step: ask_stylist ──────────────────────────────────────────────────
    if (step === 'ask_stylist') {
        const stylistResult = await extractStylistFromMessage(userMessage, stylists, env);
        if (!stylistResult) {
            const stylistNames = stylists.map(s => s.name).join(', ');
            return {
                response: `Who would you prefer? Our stylists: ${stylistNames} — or say "any" for whoever's free.`,
                newState: state
            };
        }
        const stylistId = stylistResult === 'any' ? 'any' : stylistResult.id;
        const stylistName = stylistResult === 'any' ? 'any available stylist' : stylistResult.name;
        const newState = { ...state, step: 'ask_date', stylist_id: stylistId, stylist_name: stylistName };
        return {
            response: `Perfect! What date would you like to come in?`,
            newState
        };
    }

    // ── Step: ask_date ─────────────────────────────────────────────────────
    if (step === 'ask_date') {
        const date = await parseDateFromMessage(userMessage, env);
        if (!date) {
            return {
                response: `What date works for you? (e.g. "tomorrow", "Friday", "March 5th")`,
                newState: state
            };
        }
        const newState = { ...state, step: 'ask_time', date, time: undefined };
        return {
            response: `${date} — sounds good! What time would you like?`,
            newState
        };
    }

    // ── Step: ask_time + availability check ───────────────────────────────
    if (step === 'ask_time') {
        const time = await parseTimeFromMessage(userMessage, env);
        if (!time) {
            return {
                response: `What time works for you? (e.g. "3pm", "10:30", "2:00 PM")`,
                newState: state
            };
        }

        // Build datetime and check availability
        const startTime = new Date(`${state.date}T${time}:00+05:30`);
        const endTime = new Date(startTime.getTime() + (state.service_duration || 60) * 60 * 1000);

        // Determine which stylists to check
        let targetStylistId: string | null = null;
        let targetStylistName = '';

        if (state.stylist_id === 'any') {
            // Find first available stylist
            for (const stylist of stylists) {
                const bookings = await getBookingsForStylist(db, stylist.id, startTime);
                const busy = bookings.some(b =>
                    b.status === 'confirmed' &&
                    startTime < b.end_time && endTime > b.start_time
                );
                if (!busy) {
                    targetStylistId = stylist.id;
                    targetStylistName = stylist.name;
                    break;
                }
            }
        } else {
            const bookings = await getBookingsForStylist(db, state.stylist_id, startTime);
            const busy = bookings.some(b =>
                b.status === 'confirmed' &&
                startTime < b.end_time && endTime > b.start_time
            );
            if (!busy) {
                targetStylistId = state.stylist_id;
                targetStylistName = state.stylist_name;
            }
        }

        if (targetStylistId) {
            // AVAILABLE — advance to name/phone
            const newState = { ...state, step: 'ask_name_phone', time, stylist_id: targetStylistId, stylist_name: targetStylistName, retry_count: 0 };
            return {
                response: `${targetStylistName} is free at ${formatTime(time)} on ${state.date}.\n\nWhat's your name and phone number so I can lock that in?`,
                newState
            };
        }

        // NOT AVAILABLE
        const retryCount = (state.retry_count || 0) + 1;

        if (retryCount >= 3) {
            // Too many retries — suggest changing date
            const newState = { ...state, step: 'ask_date', time: undefined, retry_count: 0 };
            return {
                response: `Sorry, we're quite booked around that time. Would you like to try a different date?`,
                newState
            };
        }

        // Show alternatives
        const alts = await findAlternativeSlots(db, state, stylists, startTime, state.service_duration || 60);
        const altText = alts.length > 0
            ? `\n\nAvailable times: ${alts.join(', ')}`
            : '';

        const newState = { ...state, time: undefined, retry_count: retryCount };
        return {
            response: `Sorry, that slot isn't available.${altText}\n\nWhat time would you prefer?`,
            newState
        };
    }

    // ── Step: ask_name_phone ───────────────────────────────────────────────
    if (step === 'ask_name_phone') {
        const contact = await extractNamePhone(userMessage, env);
        if (!contact || !contact.phone) {
            return {
                response: `Could you share your name and phone number? (e.g. "John Silva, 0771234567")`,
                newState: state
            };
        }
        const newState = { ...state, step: 'confirm', name: contact.name, phone: contact.phone };
        const timeFormatted = formatTime(state.time);
        return {
            response: `Just to confirm your booking:\n\n` +
                `📋 Service: ${state.service_name}\n` +
                `💇 Stylist: ${state.stylist_name}\n` +
                `📅 Date: ${state.date}\n` +
                `⏰ Time: ${timeFormatted}\n` +
                `👤 Name: ${contact.name}\n` +
                `📞 Phone: ${contact.phone}\n\n` +
                `Shall I confirm this? (yes / no)`,
            newState
        };
    }

    // ── Step: confirm ──────────────────────────────────────────────────────
    if (step === 'confirm') {
        const lower = userMessage.toLowerCase().trim();

        if (/^(yes|yeah|yep|confirm|ok|sure|correct|book it|please)/i.test(lower)) {
            // CREATE BOOKING
            const startTime = new Date(`${state.date}T${state.time}:00+05:30`);
            const endTime = new Date(startTime.getTime() + (state.service_duration || 60) * 60 * 1000);

            try {
                const booking = await createBooking(db, {
                    client_name: state.name,
                    client_email: `${state.name.toLowerCase().replace(/\s+/g, '')}@guest.com`,
                    client_phone: state.phone,
                    service_id: state.service_id,
                    stylist_id: state.stylist_id,
                    start_time: startTime,
                    end_time: endTime,
                    status: 'confirmed',
                });

                // Push to Google Calendar (non-fatal)
                let gcalNote = '';
                try {
                    const gcal = createGoogleCalendarClient(env);
                    const stylist = stylists.find(s => s.id === state.stylist_id);
                    const service = services.find(s => s.id === state.service_id);
                    const eventId = await gcal.createEvent(booking, service?.name || state.service_name, stylist?.name || state.stylist_name);
                    await updateBooking(db, booking.id, { google_event_id: eventId });
                } catch (gcalErr) {
                    console.error('GCal push failed:', gcalErr);
                }

                // Build WhatsApp link for owner notification
                let waLink = '';
                try {
                    const settings = await getGlobalSettings(db);
                    const ownerPhone = settings['owner_whatsapp'];
                    if (ownerPhone) {
                        const msg = `New booking!\nClient: ${state.name}\nPhone: ${state.phone}\nService: ${state.service_name}\nStylist: ${state.stylist_name}\nDate: ${state.date} ${formatTime(state.time)}\nRef: ${booking.id}`;
                        waLink = `\n\nNotify salon: https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                    }
                } catch {}

                const newState = { ...state, step: 'complete', booking_id: booking.id };
                return {
                    response: `You're all booked! See you at The MOST on ${state.date} at ${formatTime(state.time)}. ✨${waLink}`,
                    newState
                };
            } catch (err) {
                console.error('Booking creation failed:', err);
                return {
                    response: `Sorry, I had trouble confirming that. Please call us directly to book.`,
                    newState: state
                };
            }
        }

        if (/^(no|nope|cancel|change|wrong)/i.test(lower)) {
            const newState = { step: 'ask_service', retry_count: 0 };
            return {
                response: `No problem! Let's start fresh. What service would you like?`,
                newState
            };
        }

        // Unclear answer
        return {
            response: `Just say "yes" to confirm or "no" to start over.`,
            newState: state
        };
    }

    // ── Step: complete ─────────────────────────────────────────────────────
    if (step === 'complete') {
        // Conversation is done — friendly fallback
        return {
            response: `Your booking is confirmed! Is there anything else I can help with?`,
            newState: state
        };
    }

    // Fallback — reset
    return {
        response: `Welcome to The MOST! What service would you like today?`,
        newState: { step: 'ask_service', retry_count: 0 }
    };
}

/** Format HH:MM (24h) to human-readable "3:30 PM" */
function formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

/** Find up to 3 alternative time slots on the same date */
async function findAlternativeSlots(
    db: D1Database,
    state: any,
    stylists: any[],
    aroundTime: Date,
    durationMinutes: number
): Promise<string[]> {
    const alts: string[] = [];
    const stylistsToCheck = state.stylist_id === 'any' ? stylists : stylists.filter(s => s.id === state.stylist_id);

    for (const stylist of stylistsToCheck) {
        const bookings = await getBookingsForStylist(db, stylist.id, aroundTime);
        // Try slots 1h before and after, on 30-min intervals
        for (const offset of [-60, 30, 60, 90, 120]) {
            const candidate = new Date(aroundTime.getTime() + offset * 60 * 1000);
            const candEnd = new Date(candidate.getTime() + durationMinutes * 60 * 1000);
            const busy = bookings.some(b =>
                b.status === 'confirmed' &&
                candidate < b.end_time && candEnd > b.start_time
            );
            if (!busy && candidate > new Date()) {
                const h = candidate.getUTCHours();
                const m = candidate.getUTCMinutes();
                const hh = String(h).padStart(2, '0');
                const mm = String(m).padStart(2, '0');
                alts.push(`${formatTime(`${hh}:${mm}`)} (${stylist.name})`);
                if (alts.length >= 3) return alts;
            }
        }
    }
    return alts;
}
```

### Step 3: Commit state machine

```bash
git add lib/chat-agent.ts
git commit -m "feat: add booking state machine with availability checks"
```

---

## Task 4: Wire State Machine into `handleChat`

**Files:**
- Modify: `src/worker.ts` — update `handleChat` function

### Step 1: Update imports at top of `src/worker.ts`

Replace:
```ts
import { generateAIResponse, extractContactInfo } from '../lib/chat-agent';
```
With:
```ts
import { generateAIResponse, extractContactInfo, runBookingStateMachine } from '../lib/chat-agent';
```

Also add to the db imports:
```ts
import { ..., getBookingState, setBookingState } from '../lib/database';
```
(add `getBookingState` and `setBookingState` to the existing destructured import)

### Step 2: Replace the entire body of `handleChat` with the following

Find the `async function handleChat(...)` block and replace its body (everything between the first `{` and the matching `}`):

```ts
async function handleChat(request: Request, env: Env): Promise<Response> {
    const { messages, chatId, clientId }: any = await request.json();

    if (!messages || !Array.isArray(messages)) {
        return json({ error: 'Invalid request body' }, 400);
    }

    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role !== 'user') {
        return json({ error: 'Last message must be from user' }, 400);
    }

    // 1. Resolve Chat Session
    let chat = chatId ? await getChatById(env.DB, chatId) : await getChat(env.DB, clientId);
    if (!chat) chat = await createChat(env.DB, clientId);

    // 2. Save User Message
    await addMessage(env.DB, chat.id, 'user', lastUserMessage.content);

    // 3. Extract Contact Info (lead gen — best-effort)
    const contactInfo = await extractContactInfo(lastUserMessage.content, env);
    if (contactInfo) {
        await updateChatContact(env.DB, chat.id, contactInfo.name, contactInfo.phone);
    }

    // 4. Handle Response
    if (chat.ai_status !== 1) {
        return json({ chatId: chat.id, status: 'waiting_for_agent' });
    }

    // 5. Run state machine
    const currentState = await getBookingState(env.DB, chat.id);
    const { response, newState } = await runBookingStateMachine(
        currentState,
        lastUserMessage.content,
        env,
        env.DB
    );
    await setBookingState(env.DB, chat.id, newState);

    // 6. Save and return bot response
    const savedMsg = await addMessage(env.DB, chat.id, 'assistant', response);
    return json({ chatId: chat.id, message: savedMsg });
}
```

### Step 3: Build to verify no TypeScript errors

```bash
npx wrangler deploy --dry-run
```
Expected: Build succeeds, no TypeScript errors

### Step 4: Commit

```bash
git add src/worker.ts
git commit -m "feat: wire state machine into handleChat, remove old LLM-extraction flow"
```

---

## Task 5: Apply migration to production D1

### Step 1: Apply migration to remote D1

```bash
npx wrangler d1 execute most-salon-db --remote --file=migrations/0005_booking_state.sql
```
Expected: `Successfully applied migration`

### Step 2: Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```
Expected: `Deployed most-salon to X routes`

---

## Task 6: Smoke Test

### Step 1: Open the chatbot and run a full booking flow

Send these messages in sequence:
1. "Hi" → bot should ask what service
2. "Haircut" → bot should list stylists, ask for preference
3. "Any" → bot should ask for date
4. "Tomorrow" → bot should ask for time
5. "3pm" → bot should check availability
   - If available: bot asks for name + phone
   - If not: bot shows alternatives
6. "John Silva, 0771234567" → bot shows booking summary
7. "Yes" → bot confirms + shows WhatsApp link

### Step 2: Verify booking appears in admin panel

Open `/admin` → check Bookings tab → booking should appear with correct details.

### Step 3: Verify GCal event was created

Check Google Calendar (the one configured in `wrangler.toml`) for the event.

### Step 4: Verify state doesn't reset mid-conversation

After step 3 (date selected), if user sends "actually 4pm instead", the bot should ask for time again (staying in `ask_time` step) without re-asking for service or stylist.

---

## Rollback Plan

If something breaks in production:
```bash
# Revert to previous deploy
npx wrangler rollback
```

The DB migration (`ALTER TABLE ADD COLUMN`) is safe — existing rows just get `NULL` for `booking_state`, which the state machine handles by initializing fresh state.
