import { D1Database } from '../lib/db-types';
import {
    getServices,
    getStylists,
    getStylist,
    getService,
    getBookings,
    createBooking,
    updateBookingStatus,
    updateBookingTime,
    getBookingsForStylist
} from '../lib/database';
import {
    generateSlotsForStylist,
    generateSlotsAllStylists,
    filterFutureSlots
} from '../lib/slot-engine';
import { createGoogleCalendarClient } from '../lib/google-calendar';

interface Env {
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    DB: D1Database;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_AI_TOKEN?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_REFRESH_TOKEN?: string;
    GOOGLE_CALENDAR_ID?: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // API routing
        try {
            if (path === '/api/services' && method === 'GET') {
                return json(await getServices(env.DB));
            }

            if (path === '/api/stylists' && method === 'GET') {
                return json(await getStylists(env.DB, true));
            }

            if (path === '/api/availability' && method === 'GET') {
                return handleAvailability(url, env);
            }

            if (path === '/api/bookings' && method === 'GET') {
                return json(await getBookings(env.DB));
            }

            if (path === '/api/bookings' && method === 'POST') {
                return handleCreateBooking(request, env);
            }

            if (path === '/api/bookings' && method === 'PATCH') {
                return handleUpdateBooking(request, env);
            }

            if (path === '/api/chat' && method === 'POST') {
                return handleChat(request);
            }

            if (path === '/api/whatsapp' && method === 'POST') {
                return handleWhatsApp(request);
            }

            if (path === '/api/calendar/sync' && method === 'GET') {
                return json({ message: 'Calendar sync requires environment variables. Configure in Cloudflare dashboard.' });
            }
        } catch (error: any) {
            return json({ error: error.message || 'Internal server error' }, 500);
        }

        // Serve static assets for everything else
        return env.ASSETS.fetch(request);
    },
};

// --- Helper ---
function json(data: any, status = 200): Response {
    return Response.json(data, {
        status,
        headers: { 'Access-Control-Allow-Origin': '*' },
    });
}

// --- API Handlers ---

async function handleAvailability(url: URL, env: Env): Promise<Response> {
    const dateStr = url.searchParams.get('date');
    const serviceId = url.searchParams.get('serviceId');
    const stylistId = url.searchParams.get('stylistId');

    if (!dateStr || !serviceId) {
        return json({ error: 'Missing required parameters: date and serviceId' }, 400);
    }

    const date = new Date(dateStr);
    const service = await getService(env.DB, serviceId);

    if (!service) {
        return json({ error: 'Service not found' }, 404);
    }

    // Fetch busy slots from Google Calendar
    let blockedRanges: { start: Date, end: Date, bookingId?: string }[] = [];
    try {
        if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
            const calendar = createGoogleCalendarClient(env);
            blockedRanges = await calendar.getBusySlots(date);

            // Sync: Update DB bookings if GCal has them
            if (blockedRanges.length > 0) {
                for (const range of blockedRanges) {
                    if (range.bookingId) {
                        try {
                            await updateBookingTime(env.DB, range.bookingId, range.start, range.end);
                        } catch (err) {
                            console.error(`Failed to sync booking ${range.bookingId}:`, err);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Failed to fetch calendar slots:', e);
        // Continue without external blocking if API fails
    }

    if (stylistId && stylistId !== 'any') {
        const stylist = await getStylist(env.DB, stylistId);
        if (!stylist) return json({ error: 'Stylist not found' }, 404);

        const bookings = await getBookingsForStylist(env.DB, stylistId, date);
        const slots = generateSlotsForStylist(stylist, date, service.duration_minutes, bookings, blockedRanges);

        return json({
            slots: filterFutureSlots(slots).map(s => s.toISOString()),
            cached: false,
            stylist: { id: stylist.id, name: stylist.name },
        });
    }

    // Auto-assign mode
    const stylists = await getStylists(env.DB, true);
    const bookingsByStyleist = new Map();
    for (const stylist of stylists) {
        bookingsByStyleist.set(stylist.id, await getBookingsForStylist(env.DB, stylist.id, date));
    }

    const allSlots = generateSlotsAllStylists(stylists, date, service.duration_minutes, bookingsByStyleist, blockedRanges);
    const futureSlots = allSlots.filter(slot => slot.start > new Date());

    return json({
        slots: futureSlots.map(slot => ({
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
            stylist_id: slot.stylist_id,
            stylist_name: slot.stylist_name,
        })),
        cached: false,
        mode: 'auto-assign',
    });
}

async function handleCreateBooking(request: Request, env: Env): Promise<Response> {
    const body: any = await request.json();
    const { client_name, client_email, client_phone, service_id, stylist_id, start_time } = body;

    if (!client_name || !client_email || !client_phone || !service_id || !stylist_id || !start_time) {
        return json({ error: 'Missing required fields' }, 400);
    }

    const service = await getService(env.DB, service_id);
    if (!service) return json({ error: 'Service not found' }, 404);

    const stylist = await getStylist(env.DB, stylist_id);
    if (!stylist) return json({ error: 'Stylist not found' }, 404);

    const startTime = new Date(start_time);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + service.duration_minutes);

    const booking = await createBooking(env.DB, {
        client_name, client_email, client_phone, service_id, stylist_id,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
    });

    // Sync to Google Calendar if credentials are configured
    try {
        if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
            const calendar = createGoogleCalendarClient(env);
            await calendar.createEvent(booking, service.name, stylist.name);
        }
    } catch (calendarError) {
        console.error('Google Calendar sync failed:', calendarError);
        // Don't fail the booking if calendar sync fails
    }

    return json(booking, 201);
}

async function handleUpdateBooking(request: Request, env: Env): Promise<Response> {
    const body: any = await request.json();
    const { id, status } = body;

    if (!id || !status) return json({ error: 'Missing id and status' }, 400);
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        return json({ error: 'Invalid status' }, 400);
    }

    const booking = await updateBookingStatus(env.DB, id, status);
    if (!booking) return json({ error: 'Booking not found' }, 404);

    return json(booking);
}

async function handleChat(request: Request): Promise<Response> {
    const { messages }: any = await request.json();
    const lastMessage = messages[messages.length - 1];

    let response = "I'm here to help you with your beauty experience at The MOST!";
    const msg = lastMessage.content.toLowerCase();

    if (msg.includes('facial')) {
        response = "I recommend our Hydra-Glow Facial for deep hydration and radiant 'glass skin'. Would you like to book?";
    } else if (msg.includes('wedding') || msg.includes('bridal')) {
        response = "Congratulations! Our Bridal Makeup package is designed to look flawless in photos and last all day.";
    } else if (msg.includes('book')) {
        response = "You can book by clicking 'Book Now'. Need help choosing a stylist?";
    } else if (msg.includes('price') || msg.includes('cost')) {
        response = "Our services range from LKR 3,000 to LKR 25,000. Visit the Services page for full pricing!";
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            for (const word of response.split(' ')) {
                controller.enqueue(encoder.encode(word + ' '));
                await new Promise(r => setTimeout(r, 50));
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
}

async function handleWhatsApp(request: Request): Promise<Response> {
    const { phone, bookingDetails }: any = await request.json();

    const whatsappMessage = `🎉 *SALON MOST - Booking Confirmation*\n\n` +
        `👤 *Client:* ${bookingDetails.clientName}\n` +
        `📞 *Phone:* ${bookingDetails.clientPhone}\n` +
        `💇 *Service:* ${bookingDetails.serviceName}\n` +
        `👨‍💼 *Stylist:* ${bookingDetails.stylistName}\n` +
        `📅 *Date:* ${bookingDetails.date}\n` +
        `⏰ *Time:* ${bookingDetails.time}\n` +
        `💰 *Price:* LKR ${bookingDetails.price}\n\n` +
        `📍 *Location:* 762 Pannipitiya Road, Battaramulla\n\n` +
        `✅ Your booking is confirmed!`;

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    return json({ success: true, waLink, preview: whatsappMessage });
}
