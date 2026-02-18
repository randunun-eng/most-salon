
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
- If a slot is busy, say so naturally and suggest nearby times.
- When you have all 4 details (service, stylist, date/time, name + phone), summarise them warmly.
- If [SYSTEM: BOOKING SUCCESSFULLY CREATED], say "You're all booked! See you then." and include any WhatsApp link provided.
- If [SYSTEM: No booking created yet], continue the conversation naturally — do NOT repeat "I am checking". Just ask for whatever is still missing.

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

export async function extractBookingIntent(
    history: { role: string, content: string }[],
    env: any,
    db: D1Database
): Promise<any | null> {
    try {
        const services = await getServices(db);
        const stylists = await getStylists(db, true);

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' });
        const analysisPrompt = `Analyze this salon booking conversation and extract booking details if all are present.

Today's date: ${now.toISOString().split('T')[0]} (${todayStr} in Colombo, UTC+5:30)

Available Services (match by name, return the ID):
${services.map(s => `ID: ${s.id}, Name: ${s.name}`).join('\n')}

Available Stylists (match by first name or full name, return the ID):
${stylists.map(s => `ID: ${s.id}, Name: ${s.name}`).join('\n')}

INSTRUCTIONS:
- Set "ready": true ONLY when ALL of these are confirmed: service, stylist, date+time, client name, phone number.
- For dateTime: convert natural language like "today at 3:50pm" to ISO format using today's date above. "Today" = ${now.toISOString().split('T')[0]}. Use 24-hour time and Asia/Colombo timezone offset (+05:30).
- For stylist: match partial names (e.g. "Sarah" → Sarah Johnson). If user said "any", use the first stylist's ID as fallback.
- If the AI assistant summarised all details and the user replied "yes" or confirmed, treat it as ready.

Return ONLY this JSON (no explanation):
{
  "ready": true/false,
  "serviceId": "...",
  "stylistId": "...",
  "dateTime": "YYYY-MM-DDTHH:mm:00",
  "name": "...",
  "phone": "..."
}`;

        const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: analysisPrompt },
                ...history.slice(-6) // Analyze last 6 messages
            ]
        });

        const jsonMatch = aiResponse.response?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            if (result.ready) return result;
        }
    } catch (e) {
        console.error('Booking Intent Error:', e);
    }
    return null;
}
