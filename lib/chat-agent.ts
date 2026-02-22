
import { D1Database } from './db-types';
import { getServices, getStylists, getBookings } from './database';

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
