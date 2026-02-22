
import { D1Database } from './db-types';
import { getServices, getStylists, getBookingsForStylist, createBooking, updateBooking, getGlobalSettings } from './database';
import { createGoogleCalendarClient } from './google-calendar';

interface AIEventAnalysis {
    serviceName: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    stylistName?: string;
    stylistId?: string;
    notes?: string;
    confidence: number;
}

export async function generateAIResponse(
    userMessage: string,
    history: { role: string, content: string }[],
    env: any,
    db: D1Database,
    externalBusySlots: any[] = []
): Promise<string> {
    try {
        // 1. Fetch Dynamic Context from DB
        const services = await getServices(db);
        const stylists = await getStylists(db, true); // Active only
        const allBookings = await getBookings(db);

        // Format data for prompt (never expose internal IDs to the AI's visible context)
        const servicesText = services.map(s => `- ${s.name}: ${s.price} LKR (${s.duration_minutes} min)`).join('\n');
        const stylistsText = stylists.map(s => `- ${s.name}`).join('\n');

        // Context: Only show confirmed bookings for the next 7 days (expanded from 3)
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days context

        let busySlots = allBookings
            .filter(b => b.status === 'confirmed' && b.start_time >= now && b.start_time <= nextWeek)
            .map(b => `- ${stylists.find(s => s.id === b.stylist_id)?.name || 'Stylist'}: ${b.start_time.toLocaleString('en-US', { timeZone: 'Asia/Colombo' })} - ${b.end_time.toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo' })}`);

        // Add External Google Calendar Slots
        if (externalBusySlots && externalBusySlots.length > 0) {
            externalBusySlots.forEach(slot => {
                const start = new Date(slot.start);
                const end = new Date(slot.end);
                if (start >= now && start <= nextWeek) {
                    busySlots.push(`- BUSY (Google Calendar): ${start.toLocaleString('en-US', { timeZone: 'Asia/Colombo' })} - ${end.toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo' })}`);
                }
            });
        }

        const busySlotsText = busySlots.join('\n');

        const systemPrompt = `You are "Most Bot", the warm and friendly AI receptionist for The MOST Luxury Salon. You speak naturally and conversationally — never robotic, never expose internal IDs or system details.

GREETING: When a guest says hi, hello, or any greeting with no other context, always respond with:
"Welcome to The MOST! How can I help you today?"
Nothing else. Wait for them to tell you what they need.

SALON SERVICES (LKR):
${servicesText}

OUR STYLISTS:
${stylistsText}

BUSY SLOTS (never book these times):
${busySlotsText || 'None — all slots open.'}

BOOKING FLOW — once the guest mentions a service or need, guide naturally through these steps:
1. Confirm the service.
2. Ask which stylist they'd like — names only. Example: "We have Sarah, Michael, Emma and Sashini — any preference, or shall I find whoever's free?"
3. Ask for date and time.
4. Ask for their name and phone number.

RULES:
- NEVER mention IDs, database fields, or system internals. Names only.
- Keep replies short — 1–3 sentences. Be warm, not wordy.
- Use EXACT prices from the list above.
- NEVER say a time slot is unavailable or busy unless it appears in the BUSY SLOTS list above. Do not guess or invent unavailability.
- Do NOT suggest alternative times unless you know from BUSY SLOTS that the requested time is taken.
- When you have all 3 booking details (service, stylist, date/time), ask for name and phone, then summarise all 5 details and wait for confirmation.
- If [SYSTEM: BOOKING SUCCESSFULLY CREATED], say "You're all booked! See you then." and include any WhatsApp link provided. Stop the booking flow.
- If [SYSTEM: Booking already confirmed], just respond naturally — do not restart the booking flow.
- If [SYSTEM: No booking created yet], continue the conversation naturally — ask for whatever is still missing.

Today: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (Colombo time)
`;

        // 2. Call Cloudflare AI using native binding
        const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.slice(-6), // Slightly more context
                { role: 'user', content: userMessage }
            ],
            max_tokens: 500
        });

        return aiResponse.response || "I'm having trouble connecting to the salon schedule right now. Please try again in a moment.";

    } catch (error) {
        console.error('AI Generation Error:', error);
        return "I apologize, but I'm currently undergoing maintenance. Please call us directly.";
    }
}

export async function extractContactInfo(
    message: string,
    env: any
): Promise<{ name?: string, phone?: string } | null> {
    // Simple regex for phone (Sri Lanka focus)
    const phoneMatch = message.match(/(?:0|94|\+94)?7[0-9]{8}/);

    if (!phoneMatch) return null; // Only bother if we see a phone number

    // Use AI to extract name if phone is present
    try {
        const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: 'Extract the user name and phone number from the message. Return strictly JSON: {"name": "...", "phone": "..."}' },
                { role: 'user', content: message }
            ]
        });

        const jsonMatch = aiResponse.response?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        // Fallback to regex result
    }

    return { phone: phoneMatch[0] };
}

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

/** Extract stylist preference. Returns stylist object, 'any', or null if unclear. */
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
    // Regex-first: handles "3pm", "9.30am", "10:45 AM", "14:30" reliably
    const ampm = message.match(/\b(\d{1,2})(?:[:\.](\d{2}))?\s*(am|pm)\b/i);
    if (ampm) {
        let h = parseInt(ampm[1]);
        const m = ampm[2] ? parseInt(ampm[2]) : 0;
        const period = ampm[3].toLowerCase();
        if (period === 'pm' && h !== 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }
    // 24h format: "14:30", "9:00"
    const h24 = message.match(/\b(\d{1,2}):(\d{2})\b/);
    if (h24) {
        const h = parseInt(h24[1]);
        const m = parseInt(h24[2]);
        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }
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

/**
 * Main state machine — called on every user message when AI mode is active.
 * Returns the bot's deterministic response text and updated state.
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

    // After a completed booking, reset to fresh state on the next message
    if (state.step === 'complete') {
        state = { step: 'ask_service', retry_count: 0 };
    }

    // Global "start over" — user can reset from any step
    if (/\b(start over|restart|reset|cancel|new booking|forget it)\b/i.test(userMessage)) {
        return {
            response: `No problem — let's start fresh! What service would you like?`,
            newState: { step: 'ask_service', retry_count: 0 }
        };
    }

    let { step } = state;

    // ── Step: ask_service ──────────────────────────────────────────────────
    if (step === 'ask_service') {
        // Greetings — just welcome, don't dump the service list yet
        if (/^(hi|hello|hey|hiya|good\s*(morning|afternoon|evening)|howdy|greetings|sup|yo)\b/i.test(userMessage.trim())) {
            return {
                response: `Welcome to The MOST! How can I help you today?`,
                newState: state
            };
        }

        const service = await extractServiceFromMessage(userMessage, services, env);
        if (!service) {
            const serviceList = services.map((s: any) => `${s.name} (${s.price} LKR)`).join('\n');
            return {
                response: `What service would you like today?\n\n${serviceList}`,
                newState: state
            };
        }
        const newState = { ...state, step: 'ask_stylist', service_id: service.id, service_name: service.name, service_duration: service.duration };
        const stylistNames = stylists.map((s: any) => s.name).join(', ');
        return {
            response: `Great choice — ${service.name}! Do you have a preferred stylist?\n\nOur team: ${stylistNames}\n\nOr just say "any" and I'll find whoever's free.`,
            newState
        };
    }

    // ── Step: ask_stylist ──────────────────────────────────────────────────
    if (step === 'ask_stylist') {
        const stylistResult = await extractStylistFromMessage(userMessage, stylists, env);
        if (!stylistResult) {
            const stylistNames = stylists.map((s: any) => s.name).join(', ');
            return {
                response: `Who would you prefer? Our stylists: ${stylistNames} — or say "any" for whoever's free.`,
                newState: state
            };
        }
        const stylistId = stylistResult === 'any' ? 'any' : (stylistResult as any).id;
        const stylistName = stylistResult === 'any' ? 'any available stylist' : (stylistResult as any).name;
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
        const wantAnyStylest = /\b(any|other stylist|someone else|whoever|different stylist|any stylist|anyone|other)\b/i.test(userMessage);

        // Detect "any other stylist" intent — switch to auto-assign
        if (wantAnyStylest) {
            state = { ...state, stylist_id: 'any', stylist_name: 'any available stylist' };
        }

        // Parse time from message, or fall back to last attempted time if user only asked to change stylist
        let time = await parseTimeFromMessage(userMessage, env);
        if (!time && wantAnyStylest && state.last_attempted_time) {
            time = state.last_attempted_time; // re-check same time with new stylist preference
        }

        if (!time) {
            return {
                response: `What time works for you? (e.g. "3pm", "10:30", "2:00 PM")`,
                newState: state
            };
        }

        // Build datetime and check availability
        const startTime = new Date(`${state.date}T${time}:00+05:30`);
        const endTime = new Date(startTime.getTime() + (state.service_duration || 60) * 60 * 1000);

        let targetStylistId: string | null = null;
        let targetStylistName = '';

        if (state.stylist_id === 'any') {
            for (const stylist of stylists) {
                const bookings = await getBookingsForStylist(db, (stylist as any).id, startTime);
                const busy = bookings.some((b: any) =>
                    b.status === 'confirmed' &&
                    startTime < b.end_time && endTime > b.start_time
                );
                if (!busy) {
                    targetStylistId = (stylist as any).id;
                    targetStylistName = (stylist as any).name;
                    break;
                }
            }
        } else {
            const bookings = await getBookingsForStylist(db, state.stylist_id, startTime);
            const busy = bookings.some((b: any) =>
                b.status === 'confirmed' &&
                startTime < b.end_time && endTime > b.start_time
            );
            if (!busy) {
                targetStylistId = state.stylist_id;
                targetStylistName = state.stylist_name;
            }
        }

        if (targetStylistId) {
            const newState = { ...state, step: 'ask_name_phone', time, stylist_id: targetStylistId, stylist_name: targetStylistName, retry_count: 0 };
            return {
                response: `${targetStylistName} is free at ${formatTime(time)} on ${state.date}.\n\nWhat's your name and phone number so I can lock that in?`,
                newState
            };
        }

        // NOT AVAILABLE
        const retryCount = (state.retry_count || 0) + 1;

        if (retryCount >= 3) {
            const newState = { ...state, step: 'ask_date', time: undefined, retry_count: 0 };
            return {
                response: `Sorry, we're quite booked around that time. Would you like to try a different date?`,
                newState
            };
        }

        const alts = await findAlternativeSlots(db, state, stylists, startTime, state.service_duration || 60);
        const altText = alts.length > 0 ? `\n\nAvailable times: ${alts.join(', ')}` : '';
        const newState = { ...state, time: undefined, last_attempted_time: time, retry_count: retryCount };
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
                try {
                    const gcal = createGoogleCalendarClient(env);
                    const stylist = stylists.find((s: any) => s.id === state.stylist_id);
                    const service = services.find((s: any) => s.id === state.service_id);
                    const eventId = await gcal.createEvent(booking, (service as any)?.name || state.service_name, (stylist as any)?.name || state.stylist_name);
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

        return {
            response: `Just say "yes" to confirm or "no" to start over.`,
            newState: state
        };
    }

    // ── Step: complete ─────────────────────────────────────────────────────
    if (step === 'complete') {
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
    const stylistsToCheck = state.stylist_id === 'any' ? stylists : stylists.filter((s: any) => s.id === state.stylist_id);

    for (const stylist of stylistsToCheck) {
        const bookings = await getBookingsForStylist(db, stylist.id, aroundTime);
        for (const offset of [-60, 30, 60, 90, 120]) {
            const candidate = new Date(aroundTime.getTime() + offset * 60 * 1000);
            const candEnd = new Date(candidate.getTime() + durationMinutes * 60 * 1000);
            const busy = bookings.some((b: any) =>
                b.status === 'confirmed' &&
                candidate < b.end_time && candEnd > b.start_time
            );
            if (!busy && candidate > new Date()) {
                // Convert UTC to Colombo (UTC+5:30) for display
                const colombo = new Date(candidate.getTime() + 330 * 60 * 1000);
                const h = colombo.getUTCHours();
                const m = colombo.getUTCMinutes();
                const hh = String(h).padStart(2, '0');
                const mm = String(m).padStart(2, '0');
                alts.push(`${formatTime(`${hh}:${mm}`)} (${stylist.name})`);
                if (alts.length >= 3) return alts;
            }
        }
    }
    return alts;
}
