// lib/calendar-ai.ts
import { D1Database } from './db-types';
import { updateBookingStatus, updateBookingTime, getServices, getStylists } from './database';

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
