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
    getChat,
    createChat,
    addMessage,
    getMessages,
    getChatById,
    updateChatContact,
    getAllChats,
    updateChatStatus
} from '../lib/database';
import {
    generateSlotsForStylist,
    generateSlotsAllStylists,
    filterFutureSlots
} from '../lib/slot-engine';
import { generateAIResponse, extractContactInfo } from '../lib/chat-agent';
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
                return json(await createStylist(env.DB, body), 201);
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
                    const { stylist_id, calendar_id } = await request.json();
                    await updateStylistIntegration(env.DB, stylist_id, calendar_id);
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
        const blockedRanges = await calendar.getBusySlots(start, end);

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

    let externalBusySlots: { start: Date, end: Date }[] = [];
    try {
        if (env.GOOGLE_CLIENT_ID) {
            const calendar = createGoogleCalendarClient(env);
            externalBusySlots = await calendar.getBusySlots(date);
        }
    } catch (e) { console.error(e); }

    if (stylistId && stylistId !== 'any') {
        const stylist = await getStylist(env.DB, stylistId);
        if (!stylist) return json({ error: 'Stylist not found' }, 404);

        const bookings = await getBookingsForStylist(env.DB, stylistId, date);
        const slots = generateSlotsForStylist(stylist, date, service.duration_minutes, bookings, externalBusySlots, businessHours, holidays);

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

    const allSlots = generateSlotsAllStylists(stylists, date, service.duration_minutes, bookingsByStyleist, externalBusySlots, businessHours, holidays);
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
// ... (skip other handlers) ...

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

    let booking = await createBooking(env.DB, {
        client_name, client_email, client_phone, service_id, stylist_id,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
    });

    // Sync to Google Calendar
    try {
        let calendar = null;

        // 1. Try Stylist Integration
        const integration = await getStylistIntegration(env.DB, stylist_id);
        if (integration && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
            const { GoogleCalendarClient } = await import('../lib/google-calendar');
            calendar = new GoogleCalendarClient({
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
                refreshToken: integration.google_refresh_token,
                calendarId: integration.calendar_id || 'primary'
            });
        }

        // 2. Fallback to Global Environment
        if (!calendar && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
            calendar = createGoogleCalendarClient(env);
        }

        if (calendar) {
            const eventId = await calendar.createEvent(booking, service.name, stylist.name);
            const updated = await updateBooking(env.DB, booking.id, { google_event_id: eventId });
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
    const { id, ...updates } = body;

    if (!id) return json({ error: 'Missing id' }, 400);

    if (updates.start_time) updates.start_time = new Date(updates.start_time);
    if (updates.end_time) updates.end_time = new Date(updates.end_time);

    const booking = await updateBooking(env.DB, id, updates);
    if (!booking) return json({ error: 'Booking not found' }, 404);

    try {
        let calendar = null;
        const integration = await getStylistIntegration(env.DB, booking.stylist_id);
        if (integration && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
            const { GoogleCalendarClient } = await import('../lib/google-calendar');
            calendar = new GoogleCalendarClient({
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
                refreshToken: integration.google_refresh_token,
                calendarId: integration.calendar_id || 'primary'
            });
        }

        if (!calendar && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
            calendar = createGoogleCalendarClient(env);
        }

        if (calendar) {
            const service = await getService(env.DB, booking.service_id);
            const stylist = await getStylist(env.DB, booking.stylist_id);
            if (service && stylist) {
                await calendar.updateEvent(booking, service.name, stylist.name);
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
        let calendar = null;
        const integration = await getStylistIntegration(env.DB, booking.stylist_id);
        if (integration && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
            const { GoogleCalendarClient } = await import('../lib/google-calendar');
            calendar = new GoogleCalendarClient({
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
                refreshToken: integration.google_refresh_token,
                calendarId: integration.calendar_id || 'primary'
            });
        }

        if (!calendar && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
            calendar = createGoogleCalendarClient(env);
        }

        if (calendar) {
            await calendar.deleteEvent(booking.id);
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

    if (!chat) {
        chat = await createChat(env.DB, clientId);
    }

    // 2. Save User Message
    await addMessage(env.DB, chat.id, 'user', lastUserMessage.content);

    // 3. Extract Contact Info
    const contactInfo = await extractContactInfo(lastUserMessage.content, env);
    if (contactInfo) {
        await updateChatContact(env.DB, chat.id, contactInfo.name, contactInfo.phone);
    }

    // 4. Handle Response logic
    if (chat.ai_status === 1) {
        // AI Mode: Active
        const history = await getMessages(env.DB, chat.id);
        const historySimple = history.map(m => ({ role: m.role, content: m.content }));

        // --- CONTEXT PREPARATION ---
        // 1. Sync GCal for next 7 days
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        await syncWithGoogleCalendar(env, today, nextWeek);

        // 2. Fetch Busy Slots from GCal (External events)
        let externalBusySlots: any[] = [];
        try {
            if (env.GOOGLE_CLIENT_ID) {
                const calendar = createGoogleCalendarClient(env);
                externalBusySlots = await calendar.getBusySlots(today, nextWeek);
            }
        } catch (e) { console.error('GCal Fetch Error:', e); }

        // 3. Inject into AI Context (Prepare external slots for later use)
        // We will pass externalBusySlots to the final generateAIResponse call.

        // 4. Check for Booking Intent
        let bookingStatusContext = "";
        try {
            const bookingIntent = await import('../lib/chat-agent').then(m => m.extractBookingIntent(historySimple, env, env.DB));

            if (bookingIntent && bookingIntent.ready) {
                const { serviceId, stylistId, dateTime, name, phone } = bookingIntent;
                const service = await getService(env.DB, serviceId);

                if (service) {
                    const startTime = new Date(dateTime);
                    const endTime = new Date(startTime);
                    endTime.setMinutes(endTime.getMinutes() + service.duration_minutes);

                    let targetStylistId = stylistId === 'any' ? (await getStylists(env.DB, true))[0]?.id : stylistId;

                    // VALIDATION: Check if slot is busy
                    const existingBookings = await getBookings(env.DB);
                    const isBusy = existingBookings.some(b =>
                        b.stylist_id === targetStylistId &&
                        b.status === 'confirmed' &&
                        ((startTime >= b.start_time && startTime < b.end_time) ||
                            (endTime > b.start_time && endTime <= b.end_time))
                    );

                    if (isBusy) {
                        bookingStatusContext = `[SYSTEM: The slot ${dateTime} for stylist ${targetStylistId} is BUSY. Inform user and suggest alternative.]`;
                    } else {
                        // PERFORM ACTUAL BOOKING
                        const booking = await createBooking(env.DB, {
                            client_name: name,
                            client_email: `${name.toLowerCase().replace(/\s/g, '')}@example.com`,
                            client_phone: phone,
                            service_id: serviceId,
                            stylist_id: targetStylistId,
                            start_time: startTime,
                            end_time: endTime,
                            status: 'confirmed'
                        });

                        // Sync to Google Calendar
                        try {
                            const calendar = createGoogleCalendarClient(env as any);
                            if (calendar) {
                                const stylist = await getStylist(env.DB, targetStylistId);
                                await calendar.createEvent(booking, service.name, stylist?.name || 'Stylist');
                            }
                        } catch (e) { console.error('GCal Sync Error:', e); }

                        // Build WhatsApp link to owner
                        let waLink = '';
                        try {
                            const settingsMap = await getGlobalSettings(env.DB);
                            const ownerPhone = settingsMap['owner_whatsapp'];
                            if (ownerPhone) {
                                const waMessage = encodeURIComponent(
                                    `New booking confirmed!\nClient: ${name}\nPhone: ${phone}\nTime: ${new Date(dateTime).toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}\nRef: ${booking.id}`
                                );
                                waLink = ` To notify us on WhatsApp, tap: https://wa.me/${ownerPhone.replace(/[^0-9]/g, '')}?text=${waMessage}`;
                            }
                        } catch {}

                        bookingStatusContext = `[SYSTEM: BOOKING SUCCESSFULLY CREATED. Confirmed for ${name} at ${dateTime}.${waLink}]`;
                    }
                }
            }
        } catch (error) {
            console.error('Automated Booking Logic Error:', error);
            bookingStatusContext = `[SYSTEM: Error processing booking. Ask user for more details.]`;
        }

        // CRITICAL: If no booking was created, ensure AI knows it CANNOT confirm.
        if (!bookingStatusContext.includes('BOOKING SUCCESSFULLY CREATED')) {
            bookingStatusContext += "\n[SYSTEM: No booking created yet. Continue gathering any missing details naturally. Do NOT say 'I am checking' repeatedly.]";
        }

        // 4.2 Generate AI response with updated context
        const aiResponseText = await generateAIResponse(
            lastUserMessage.content + " " + bookingStatusContext,
            historySimple,
            env,
            env.DB,
            externalBusySlots
        );

        // 4.3 Save AI Message
        const savedMsg = await addMessage(env.DB, chat.id, 'assistant', aiResponseText);

        return json({
            chatId: chat.id,
            message: savedMsg
        });

    } else {
        // Human Mode: Paused
        return json({
            chatId: chat.id,
            status: 'waiting_for_agent'
        });
    }
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
