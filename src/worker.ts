// Worker entry point — handles API routing + serves static assets
import {
    getServices,
    getStylists,
    getStylist,
    getService,
    getBookings,
    createBooking,
    updateBookingStatus,
    getBookingsForStylist,
    getCachedAvailability,
    setCachedAvailability
} from '../lib/database';
import {
    generateSlotsForStylist,
    generateSlotsAllStylists,
    filterFutureSlots
} from '../lib/slot-engine';
import { createGoogleCalendarClient } from '../lib/google-calendar';

interface Env {
    ASSETS: { fetch: (request: Request) => Promise<Response> };
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
                return json(await getServices());
            }

            if (path === '/api/stylists' && method === 'GET') {
                return json(await getStylists(true));
            }

            if (path === '/api/availability' && method === 'GET') {
                return handleAvailability(url);
            }

            if (path === '/api/bookings' && method === 'GET') {
                return json(await getBookings());
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

            // Debug endpoint: test Google Calendar connection
            if (path === '/api/calendar/test' && method === 'GET') {
                return handleCalendarTest(env);
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

async function handleAvailability(url: URL): Promise<Response> {
    const dateStr = url.searchParams.get('date');
    const serviceId = url.searchParams.get('serviceId');
    const stylistId = url.searchParams.get('stylistId');

    if (!dateStr || !serviceId) {
        return json({ error: 'Missing required parameters: date and serviceId' }, 400);
    }

    const date = new Date(dateStr);
    const service = await getService(serviceId);

    if (!service) {
        return json({ error: 'Service not found' }, 404);
    }

    if (stylistId && stylistId !== 'any') {
        const stylist = await getStylist(stylistId);
        if (!stylist) return json({ error: 'Stylist not found' }, 404);

        const cached = await getCachedAvailability(stylistId, date);
        if (cached) {
            return json({
                slots: filterFutureSlots(cached).map(s => s.toISOString()),
                cached: true,
                stylist: { id: stylist.id, name: stylist.name },
            });
        }

        const bookings = await getBookingsForStylist(stylistId, date);
        const slots = generateSlotsForStylist(stylist, date, service.duration_minutes, bookings);
        await setCachedAvailability(stylistId, date, slots);

        return json({
            slots: filterFutureSlots(slots).map(s => s.toISOString()),
            cached: false,
            stylist: { id: stylist.id, name: stylist.name },
        });
    }

    // Auto-assign mode
    const stylists = await getStylists(true);
    const bookingsByStyleist = new Map();
    for (const stylist of stylists) {
        bookingsByStyleist.set(stylist.id, await getBookingsForStylist(stylist.id, date));
    }

    const allSlots = generateSlotsAllStylists(stylists, date, service.duration_minutes, bookingsByStyleist);
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

    const service = await getService(service_id);
    if (!service) return json({ error: 'Service not found' }, 404);

    const stylist = await getStylist(stylist_id);
    if (!stylist) return json({ error: 'Stylist not found' }, 404);

    const startTime = new Date(start_time);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + service.duration_minutes);

    const booking = await createBooking({
        client_name, client_email, client_phone, service_id, stylist_id,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
    });

    // Sync to Google Calendar if credentials are configured
    try {
        if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
            const calendar = createGoogleCalendarClient(env);
            await calendar.createEvent(booking, service.name);
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

    const booking = await updateBookingStatus(id, status);
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

async function handleCalendarTest(env: Env): Promise<Response> {
    const diagnostics: any = {
        step: 'init',
        hasClientId: !!env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        hasRefreshToken: !!env.GOOGLE_REFRESH_TOKEN,
        calendarId: env.GOOGLE_CALENDAR_ID || 'NOT SET',
    };

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
        diagnostics.error = 'Missing Google credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in Cloudflare Variables.';
        return json(diagnostics, 400);
    }

    // Step 1: Try to get access token
    try {
        diagnostics.step = 'token_refresh';
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                refresh_token: env.GOOGLE_REFRESH_TOKEN,
                grant_type: 'refresh_token'
            })
        });

        const tokenData: any = await tokenResponse.json();
        diagnostics.tokenStatus = tokenResponse.status;
        diagnostics.hasAccessToken = !!tokenData.access_token;

        if (!tokenData.access_token) {
            diagnostics.tokenError = tokenData;
            return json(diagnostics, 400);
        }

        // Step 2: Try to create a test event
        diagnostics.step = 'create_event';
        const now = new Date();
        const later = new Date(now.getTime() + 30 * 60000);

        const event = {
            summary: '🧪 TEST - Salon MOST Calendar Sync',
            description: 'This is a test event to verify Google Calendar integration. You can delete this.',
            start: { dateTime: now.toISOString(), timeZone: 'Asia/Colombo' },
            end: { dateTime: later.toISOString(), timeZone: 'Asia/Colombo' },
        };

        const calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
        const eventResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            }
        );

        const eventData: any = await eventResponse.json();
        diagnostics.eventStatus = eventResponse.status;
        diagnostics.eventId = eventData.id;
        diagnostics.eventLink = eventData.htmlLink;

        if (eventResponse.status === 200) {
            diagnostics.success = true;
            diagnostics.message = '✅ Test event created successfully! Check your Google Calendar.';
        } else {
            diagnostics.success = false;
            diagnostics.eventError = eventData;
        }

    } catch (err: any) {
        diagnostics.error = err.message;
        diagnostics.stack = err.stack;
    }

    return json(diagnostics);
}
