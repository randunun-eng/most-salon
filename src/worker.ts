import { D1Database } from '../lib/db-types';
import {
    getServices,
    getStylists,
    getStylist,
    getService,
    getBookings,
    createBooking,
    updateBookingStatus,
    updateBooking,
    updateBookingTime,
    getBookingsForStylist,
    getBusinessHours,
    getHolidays,
    getStylistIntegration,
    updateBusinessHours,
    addHoliday,
    deleteHoliday,
    getGlobalSettings,
    updateGlobalSetting,
    createStylist,
    updateStylist,
    deleteStylist,
    updateStylistIntegration,
    saveStylistIntegration,
    getChat,
    createChat,
    addMessage,
    getMessages,
    getChatById,
    updateChatContact,
    getAllChats,
    updateChatStatus,
    getBookingState,
    setBookingState
} from '../lib/database';
import {
    generateSlotsForStylist,
    filterFutureSlots
} from '../lib/slot-engine';
import { generateAIResponse, extractContactInfo, runBookingStateMachine } from '../lib/chat-agent';
import { createGoogleCalendarClient, GoogleCalendarClient } from '../lib/google-calendar';

interface Env {
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    DB: D1Database;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_AI_TOKEN?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_REFRESH_TOKEN?: string;
    GOOGLE_CALENDAR_ID?: string;
    AI: any;
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
            // Public Services
            if (path === '/api/services' && method === 'GET') {
                return json(await getServices(env.DB));
            }

            // Admin Services Management
            if (path === '/api/admin/services') {
                if (method === 'GET') {
                    return json(await getServices(env.DB));
                }

                const { action, service }: any = await request.json();

                if (method === 'POST') {
                    if (action === 'create') {
                        const id = `service-${Date.now()}`;
                        await env.DB.prepare(
                            'INSERT INTO services (id, name, duration_minutes, price, category, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))'
                        ).bind(id, service.name, service.duration_minutes, service.price, service.category || 'Hair').run();
                        return json({ success: true, id });
                    }

                    if (action === 'update') {
                        await env.DB.prepare(
                            'UPDATE services SET name = ?, duration_minutes = ?, price = ?, category = ? WHERE id = ?'
                        ).bind(service.name, service.duration_minutes, service.price, service.category || 'Hair', service.id).run();
                        return json({ success: true });
                    }

                    if (action === 'delete') {
                        await env.DB.prepare('DELETE FROM services WHERE id = ?').bind(service.id).run();
                        return json({ success: true });
                    }
                }
            }

            // Admin Chat / Inbox
            if (path === '/api/admin/chat') {
                if (method === 'GET') {
                    const chatId = url.searchParams.get('chatId');
                    const clientId = url.searchParams.get('clientId');

                    if (chatId) {
                        const messages = await getMessages(env.DB, chatId);
                        return json({ chatId, messages });
                    } else if (clientId) {
                        // For public chat widget polling
                        const chat = await getChat(env.DB, clientId);
                        if (chat) {
                            const messages = await getMessages(env.DB, chat.id);
                            return json({ chatId: chat.id, messages });
                        }
                        return json({ messages: [] });
                    } else {
                        // Admin view: all chats
                        const chats = await getAllChats(env.DB);
                        return json(chats);
                    }
                }

                if (method === 'POST') {
                    const { action, chatId, content, aiStatus }: any = await request.json();

                    if (action === 'reply') {
                        if (!chatId || !content) return json({ error: 'Missing params' }, 400);
                        const msg = await addMessage(env.DB, chatId, 'admin', content);
                        return json(msg);
                    }

                    if (action === 'toggle_ai') {
                        if (!chatId || aiStatus === undefined) return json({ error: 'Missing params' }, 400);
                        await updateChatStatus(env.DB, chatId, aiStatus ? 1 : 0);
                        return json({ success: true, ai_status: aiStatus });
                    }
                }
            }

            if (path === '/api/stylists' && method === 'GET') {
                return json(await getStylists(env.DB, false)); // Include inactive for management
            }

            if (path === '/api/stylists' && method === 'POST') {
                const body = await request.json();
                return json(await createStylist(env.DB, {
                    name: body.name,
                    phone: body.phone,
                    working_days: body.working_days,
                    start_time: body.start_time,
                    end_time: body.end_time
                }), 201);
            }

            if (path === '/api/stylists' && method === 'PUT') {
                const body: any = await request.json();
                const { id, ...updates } = body;
                return json(await updateStylist(env.DB, id, updates));
            }

            if (path === '/api/stylists' && method === 'DELETE') {
                const id = url.searchParams.get('id');
                if (id) await deleteStylist(env.DB, id);
                return json({ success: true });
            }

            if (path === '/api/stylists/integration') {
                if (method === 'GET') {
                    const id = url.searchParams.get('id');
                    if (!id) return json({ error: 'Missing stylist id' }, 400);
                    return json(await getStylistIntegration(env.DB, id));
                }
                if (method === 'POST') {
                    const {
                        stylist_id,
                        calendar_id,
                        google_refresh_token,
                        google_access_token,
                        google_client_id,
                        google_client_secret
                    } = await request.json() as any;
                    if (!stylist_id) return json({ error: 'Missing stylist_id' }, 400);

                    const current = await getStylistIntegration(env.DB, stylist_id);
                    const hasOauthPayload = [google_refresh_token, google_access_token, google_client_id, google_client_secret]
                        .some(v => typeof v === 'string' && v.length > 0);

                    if (hasOauthPayload || current?.google_refresh_token || current?.google_client_id || current?.google_client_secret) {
                        await saveStylistIntegration(env.DB, {
                            stylist_id,
                            calendar_id: calendar_id ?? current?.calendar_id ?? 'primary',
                            google_refresh_token: google_refresh_token ?? current?.google_refresh_token ?? '',
                            google_access_token: google_access_token ?? current?.google_access_token ?? '',
                            google_client_id: google_client_id ?? current?.google_client_id ?? '',
                            google_client_secret: google_client_secret ?? current?.google_client_secret ?? ''
                        });
                    } else {
                        await updateStylistIntegration(env.DB, stylist_id, calendar_id || 'primary');
                    }
                    return json({ success: true });
                }
            }

            if (path === '/api/availability' && method === 'GET') {
                return handleAvailability(url, env);
            }

            // Settings: Business Hours
            if (path === '/api/settings/hours') {
                if (method === 'GET') {
                    const hours = await getBusinessHours(env.DB);
                    return json(Array.from(hours.entries()).map(([day, val]) => ({ day, ...val })));
                }
                if (method === 'POST') {
                    const { day, open, close, isClosed } = await request.json();
                    await updateBusinessHours(env.DB, day, open, close, isClosed);
                    return json({ success: true });
                }
            }

            // Settings: Holidays
            if (path === '/api/settings/holidays') {
                if (method === 'GET') {
                    const holidays = await getHolidays(env.DB);
                    return json(holidays);
                }
                if (method === 'POST') {
                    const body = await request.json();
                    const holiday = await addHoliday(env.DB, body);
                    return json(holiday, 201);
                }
                if (method === 'DELETE') {
                    const url = new URL(request.url);
                    const id = url.searchParams.get('id');
                    if (id) await deleteHoliday(env.DB, id);
                    return json({ success: true });
                }
            }

            // Settings: Global
            if (path === '/api/settings/global') {
                if (method === 'GET') {
                    return json(await getGlobalSettings(env.DB));
                }
                if (method === 'POST') {
                    const { key, value } = await request.json();
                    await updateGlobalSetting(env.DB, key, value);
                    return json({ success: true });
                }
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

            if (path === '/api/bookings' && method === 'PUT') {
                return handleEditBooking(request, env);
            }

            if (path === '/api/bookings' && method === 'DELETE') {
                return handleDeleteBooking(request, env);
            }

            if (path === '/api/chat') {
                if (method === 'GET') {
                    const clientId = url.searchParams.get('clientId');
                    if (!clientId) return json({ error: 'Missing clientId' }, 400);

                    const chat = await getChat(env.DB, clientId);
                    if (chat) {
                        const messages = await getMessages(env.DB, chat.id);
                        return json({ chatId: chat.id, messages });
                    }
                    return json({ messages: [] });
                }

                if (method === 'POST') {
                    return handleChat(request, env);
                }
            }

            if (path === '/api/whatsapp' && method === 'POST') {
                return handleWhatsApp(request, env);
            }

            if (path === '/api/calendar/sync' && method === 'GET') {
                return json({ message: 'Calendar sync requires environment variables. Configure in Cloudflare dashboard.' });
            }

            // Register GCal push webhook (call once to activate, then weekly cron re-registers)
            if (path === '/api/calendar/register' && method === 'GET') {
                const gcal = createGoogleCalendarClient(env);
                const url = new URL(request.url);
                const webhookUrl = `${url.protocol}//${url.host}/api/calendar/webhook`;
                const channelId = `salon-most-${Date.now()}`;
                const resourceId = await gcal.watchCalendar(webhookUrl, channelId);
                await updateGlobalSetting(env.DB, 'gcal_channel_id', channelId);
                await updateGlobalSetting(env.DB, 'gcal_resource_id', resourceId);
                await updateGlobalSetting(env.DB, 'gcal_sync_token', '');
                return json({ success: true, webhookUrl, channelId, resourceId, note: 'Webhook registered. Re-call every 7 days.' });
            }

            // Inbound GCal push notifications (Google calls this when owner edits on phone)
            if (path === '/api/calendar/webhook') {
                if (method === 'HEAD') return new Response(null, { status: 200 });
                if (method === 'POST') {
                    const channelId = request.headers.get('X-Goog-Channel-Id');
                    const resourceState = request.headers.get('X-Goog-Resource-State');
                    if (resourceState === 'sync') return new Response('OK', { status: 200 });
                    const settings = await getGlobalSettings(env.DB);
                    if (settings['gcal_channel_id'] && channelId !== settings['gcal_channel_id']) {
                        return new Response('Forbidden', { status: 403 });
                    }
                    try {
                        const { analyzeEventChange } = await import('../lib/calendar-ai');
                        const gcal = createGoogleCalendarClient(env);
                        const accessToken = await (gcal as any).getAccessToken();
                        const syncToken = settings['gcal_sync_token'];
                        const params: Record<string, string> = { singleEvents: 'true', showDeleted: 'true' };
                        if (syncToken) params.syncToken = syncToken;
                        else params.timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                        const eventsRes = await fetch(
                            `https://www.googleapis.com/calendar/v3/calendars/${env.GOOGLE_CALENDAR_ID}/events?${new URLSearchParams(params)}`,
                            { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
                        );
                        const eventsData = await eventsRes.json();
                        if (eventsData.nextSyncToken) await updateGlobalSetting(env.DB, 'gcal_sync_token', eventsData.nextSyncToken);
                        for (const event of (eventsData.items || [])) {
                            await analyzeEventChange(event, env.DB, env);
                        }
                    } catch (e) { console.error('Webhook processing error:', e); }
                    return new Response('OK', { status: 200 });
                }
            }
        } catch (error: any) {
            return json({ error: error.message || 'Internal server error' }, 500);
        }

        // Serve static assets for everything else
        return env.ASSETS.fetch(request);
    },

    async scheduled(_event: any, env: Env, _ctx: any): Promise<void> {
        // Re-register Google Calendar webhook (runs every Monday at 9AM UTC)
        try {
            const { createGoogleCalendarClient } = await import('../lib/google-calendar');
            const { updateGlobalSetting } = await import('../lib/database');

            const gcal = createGoogleCalendarClient(env);
            const channelId = `salon-most-${Date.now()}`;
            const webhookUrl = `https://most-salon.randunu-4oc.workers.dev/api/calendar/webhook`;
            const resourceId = await gcal.watchCalendar(webhookUrl, channelId);

            await updateGlobalSetting(env.DB, 'gcal_channel_id', channelId);
            await updateGlobalSetting(env.DB, 'gcal_resource_id', resourceId);
            await updateGlobalSetting(env.DB, 'gcal_sync_token', '');

            console.log('Scheduled: GCal webhook re-registered', { channelId, resourceId });
        } catch (e) {
            console.error('Scheduled: GCal webhook re-registration failed', e);
        }
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

// --- Helper: Google Calendar Sync ---
async function syncWithGoogleCalendar(env: Env, start: Date, end: Date): Promise<void> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) return;

    try {
        const calendar = createGoogleCalendarClient(env);
        const blockedRanges = await calendar.getBusySlots(start);

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
    } catch (e) {
        console.error('Failed to sync with Google Calendar:', e);
    }
}


async function getCalendarClientsForStylist(env: Env, stylistId: string): Promise<GoogleCalendarClient[]> {
    const clients: GoogleCalendarClient[] = [];
    const seen = new Set<string>();

    const integration = await getStylistIntegration(env.DB, stylistId);
    const stylistClientId = integration?.google_client_id || env.GOOGLE_CLIENT_ID;
    const stylistClientSecret = integration?.google_client_secret || env.GOOGLE_CLIENT_SECRET;
    const stylistRefreshToken = integration?.google_refresh_token;

    if (stylistClientId && stylistClientSecret && stylistRefreshToken) {
        const key = `${stylistClientId}|${stylistClientSecret}|${stylistRefreshToken}|${integration?.calendar_id || 'primary'}`;
        if (!seen.has(key)) {
            clients.push(new GoogleCalendarClient({
                clientId: stylistClientId,
                clientSecret: stylistClientSecret,
                refreshToken: stylistRefreshToken,
                calendarId: integration?.calendar_id || 'primary'
            }));
            seen.add(key);
        }
    }

    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
        const ownerCalendarId = env.GOOGLE_CALENDAR_ID || 'primary';
        const key = `${env.GOOGLE_CLIENT_ID}|${env.GOOGLE_CLIENT_SECRET}|${env.GOOGLE_REFRESH_TOKEN}|${ownerCalendarId}`;
        if (!seen.has(key)) {
            clients.push(createGoogleCalendarClient(env));
            seen.add(key);
        }
    }

    return clients;
}

async function getExternalBusySlotsForStylist(env: Env, stylistId: string, date: Date): Promise<{ start: Date; end: Date }[]> {
    const clients = await getCalendarClientsForStylist(env, stylistId);
    const busySlots: { start: Date; end: Date }[] = [];

    for (const client of clients) {
        try {
            const slots = await client.getBusySlots(date);
            busySlots.push(...slots.map(s => ({ start: s.start, end: s.end })));
        } catch (error) {
            console.error(`Failed to fetch busy slots for stylist ${stylistId}:`, error);
        }
    }

    return busySlots;
}

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

    // Sync Google Calendar for this date
    await syncWithGoogleCalendar(env, date, new Date(date.getTime() + 24 * 60 * 60 * 1000));

    // Fetch configuration
    const [businessHours, holidays] = await Promise.all([
        getBusinessHours(env.DB),
        getHolidays(env.DB, date, date)
    ]);

    // Fetch confirmed bookings from DB (now synced)
    const blockedRanges: { start: Date, end: Date }[] = [];
    // Note: generateSlots functions will fetch DB bookings internally or we pass them. 
    // For handleAvailability, we usually let slot-engine handle DB bookings via getBookingsForStylist.
    // The previous logic passed 'blockedRanges' from GCal directly. 
    // Now that we synced to DB, we strictly rely on DB for "Most" bookings, 
    // BUT we still need GCal "Busy" blocks (doctors appt etc) that are NOT in our DB?
    // actually syncWithGoogleCalendar only updates TIMES of existing bookings if they moved. 
    // It does NOT import "Doctor Appt" as a booking yet unless we fully implemented that.
    // Let's stick to the previous pattern: Fetch GCal busy slots for blocking, AND sync internal bookings.

    if (stylistId && stylistId !== 'any') {
        const stylist = await getStylist(env.DB, stylistId);
        if (!stylist) return json({ error: 'Stylist not found' }, 404);

        const bookings = await getBookingsForStylist(env.DB, stylistId, date);
        const externalBusySlots = await getExternalBusySlotsForStylist(env, stylistId, date);
        const slots = generateSlotsForStylist(stylist, date, service.duration_minutes, bookings, externalBusySlots, businessHours, holidays);

        return json({
            slots: filterFutureSlots(slots).map(s => s.toISOString()),
            cached: false,
            stylist: { id: stylist.id, name: stylist.name },
        });
    }

    // Auto-assign mode: calculate per stylist using each stylist's calendar + owner calendar.
    const stylists = await getStylists(env.DB, true);
    const aggregatedSlots: { start: Date; end: Date; stylist_id: string; stylist_name: string }[] = [];

    for (const stylist of stylists) {
        const bookings = await getBookingsForStylist(env.DB, stylist.id, date);
        const externalBusySlots = await getExternalBusySlotsForStylist(env, stylist.id, date);
        const slots = generateSlotsForStylist(stylist, date, service.duration_minutes, bookings, externalBusySlots, businessHours, holidays);

        for (const slot of filterFutureSlots(slots)) {
            aggregatedSlots.push({
                start: slot,
                end: new Date(slot.getTime() + service.duration_minutes * 60000),
                stylist_id: stylist.id,
                stylist_name: stylist.name,
            });
        }
    }

    const futureSlots = aggregatedSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

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
// ... (skip other handlers) ...

function isOverlapping(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
    return startA < endB && endA > startB;
}

async function findBookingConflict(
    env: Env,
    stylistId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
): Promise<any | null> {
    const bookings = await getBookingsForStylist(env.DB, stylistId, startTime);
    return bookings.find((b: any) =>
        b.id !== excludeBookingId &&
        ['confirmed', 'pending'].includes(b.status) &&
        isOverlapping(startTime, endTime, b.start_time, b.end_time)
    ) || null;
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

    const conflict = await findBookingConflict(env, stylist_id, startTime, endTime);
    if (conflict) {
        return json({
            error: "Requested slot overlaps with an existing booking",
            conflict
        }, 409);
    }

    let booking = await createBooking(env.DB, {
        client_name, client_email, client_phone, service_id, stylist_id,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
    });

    // Sync to stylist calendar and salon-owner calendar
    try {
        const calendars = await getCalendarClientsForStylist(env, stylist_id);
        let firstEventId: string | null = null;

        for (const calendar of calendars) {
            try {
                const eventId = await calendar.createEvent(booking, service.name, stylist.name);
                if (!firstEventId) firstEventId = eventId;
            } catch (calendarError) {
                console.error('Google Calendar create sync failed (non-fatal):', calendarError);
            }
        }

        if (firstEventId) {
            const updated = await updateBooking(env.DB, booking.id, { google_event_id: firstEventId });
            if (updated) booking = updated;
        }
    } catch (calendarError) {
        console.error('Google Calendar sync failed:', calendarError);
    }

    return json(booking, 201);
}

async function handleUpdateBooking(request: Request, env: Env): Promise<Response> {
    const body: any = await request.json();
    const { id, status } = body;

    if (!id || !status) return json({ error: 'Missing id and status' }, 400);
    if (!['pending', 'confirmed', 'cancelled', 'completed', 'no-show'].includes(status)) {
        return json({ error: 'Invalid status' }, 400);
    }

    const booking = await updateBookingStatus(env.DB, id, status);
    if (!booking) return json({ error: 'Booking not found' }, 404);

    return json(booking);
}

async function handleEditBooking(request: Request, env: Env): Promise<Response> {
    const body: any = await request.json();
    const { id, force_override, ...updates } = body;

    if (!id) return json({ error: 'Missing id' }, 400);

    if (updates.start_time) updates.start_time = new Date(updates.start_time);
    if (updates.end_time) updates.end_time = new Date(updates.end_time);

    const existing = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first() as any;
    if (!existing) return json({ error: 'Booking not found' }, 404);

    const nextStylistId = updates.stylist_id || existing.stylist_id;
    const nextStart = updates.start_time || new Date(existing.start_time);

    let nextEnd = updates.end_time ? updates.end_time : new Date(existing.end_time);
    if (!updates.end_time && (updates.start_time || updates.service_id)) {
        const nextService = await getService(env.DB, updates.service_id || existing.service_id);
        const duration = nextService?.duration_minutes || Math.max(15, Math.round((new Date(existing.end_time).getTime() - new Date(existing.start_time).getTime()) / 60000));
        nextEnd = new Date(nextStart.getTime() + duration * 60000);
        updates.end_time = nextEnd;
    }

    const conflict = await findBookingConflict(env, nextStylistId, nextStart, nextEnd, id);
    if (conflict && !force_override) {
        return json({
            error: "Amended slot overlaps with an existing booking",
            requires_acknowledgement: true,
            conflict
        }, 409);
    }

    const booking = await updateBooking(env.DB, id, updates);
    if (!booking) return json({ error: 'Booking not found' }, 404);

    try {
        const calendars = await getCalendarClientsForStylist(env, booking.stylist_id);
        const service = await getService(env.DB, booking.service_id);
        const stylist = await getStylist(env.DB, booking.stylist_id);

        if (service && stylist) {
            for (const calendar of calendars) {
                try {
                    await calendar.updateEvent(booking, service.name, stylist.name);
                } catch (e) {
                    console.error('Calendar update failed (non-fatal)', e);
                }
            }
        }
    } catch (e) {
        console.error('Calendar update failed', e);
    }

    return json(booking);
}

async function handleDeleteBooking(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return json({ error: 'Missing id' }, 400);

    const booking = await updateBookingStatus(env.DB, id, 'cancelled');
    if (!booking) return json({ error: 'Booking not found' }, 404);

    try {
        const calendars = await getCalendarClientsForStylist(env, booking.stylist_id);
        for (const calendar of calendars) {
            try {
                await calendar.deleteEvent(booking.id);
            } catch (e) {
                console.error('Calendar delete failed (non-fatal)', e);
            }
        }
    } catch (e) {
        console.error('Calendar delete failed', e);
    }

    return json(booking);
}

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

    // 4. Human mode — wait for agent
    if ((chat as any).ai_status !== 1) {
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

async function handleWhatsApp(request: Request, env: Env): Promise<Response> {
    const { phone, bookingDetails }: any = await request.json();
    const settings = await getGlobalSettings(env.DB);
    const salonPhone = settings.salon_whatsapp || '94779336857';

    const whatsappMessage = `🎉 *${(settings.salon_name || 'Most Salon').toUpperCase()} - Booking Confirmation* \n\n` +
        `👤 *Client:* ${bookingDetails.clientName}\n` +
        `📞 *Phone:* ${bookingDetails.clientPhone}\n` +
        `💇 *Service:* ${bookingDetails.serviceName}\n` +
        `👨‍💼 *Stylist:* ${bookingDetails.stylistName}\n` +
        `📅 *Date:* ${bookingDetails.date}\n` +
        `⏰ *Time:* ${bookingDetails.time}\n` +
        `💰 *Price:* LKR ${bookingDetails.price}\n\n` +
        `📍 *Location:* ${settings.salon_address || '762 Pannipitiya Road, Battaramulla'}\n\n` +
        `✅ Your booking is confirmed!`;

    const cleanPhone = (p: string) => {
        let cleaned = p.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0') && cleaned.length === 10) {
            cleaned = '94' + cleaned.substring(1);
        }
        return cleaned;
    };

    const cleanClientPhone = cleanPhone(phone);
    const cleanSalonPhone = cleanPhone(salonPhone);

    // Using api.whatsapp.com/send is often more reliable for triggering the desktop app/protocol handler
    const baseUrl = 'https://api.whatsapp.com/send';
    const waLink = `${baseUrl}?phone=${cleanSalonPhone}&text=${encodeURIComponent(whatsappMessage)}`;

    return json({
        success: true,
        waLink,
        salonWaLink: `${baseUrl}?phone=${cleanSalonPhone}&text=${encodeURIComponent("New Booking: " + whatsappMessage)}`,
        clientWaLink: `${baseUrl}?phone=${cleanClientPhone}&text=${encodeURIComponent(whatsappMessage)}`,
        preview: whatsappMessage
    });
}
