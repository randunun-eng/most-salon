// Cloudflare D1 Database Integration
import { Stylist, Service, Booking, AvailabilityCache, D1Database, Holiday, BusinessDay, Chat, Message } from './db-types';

// In-memory cache for availability (per-isolate)
let availabilityCache: Map<string, AvailabilityCache> = new Map();

// Helper to parse JSON fields from DB
function parseStylist(stylist: any): Stylist {
    return {
        ...stylist,
        working_days: JSON.parse(stylist.working_days),
        is_active: Boolean(stylist.is_active),
        created_at: new Date(stylist.created_at)
    };
}

function parseBooking(booking: any): Booking {
    return {
        ...booking,
        start_time: new Date(booking.start_time),
        end_time: new Date(booking.end_time),
        created_at: new Date(booking.created_at)
    };
}

// CRUD Operations for Stylists
export async function getStylists(db: D1Database, activeOnly = true): Promise<Stylist[]> {
    const query = activeOnly
        ? 'SELECT s.*, i.calendar_id FROM stylists s LEFT JOIN stylist_integrations i ON s.id = i.stylist_id WHERE s.is_active = 1'
        : 'SELECT s.*, i.calendar_id FROM stylists s LEFT JOIN stylist_integrations i ON s.id = i.stylist_id';

    const { results } = await db.prepare(query).all();
    return results.map(parseStylist);
}

export async function getStylist(db: D1Database, id: string): Promise<Stylist | null> {
    const stylist: any = await db.prepare('SELECT * FROM stylists WHERE id = ?').bind(id).first();
    return stylist ? parseStylist(stylist) : null;
}

export async function createStylist(db: D1Database, data: any): Promise<Stylist> {
    const id = `stylist-${Date.now()}`;
    await db.prepare(
        `INSERT INTO stylists (id, name, phone, working_days, start_time, end_time, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        id,
        data.name,
        data.phone || null,
        JSON.stringify(data.working_days || [0, 1, 2, 3, 4, 5, 6]),
        data.start_time || '09:00',
        data.end_time || '19:00',
        1
    ).run();

    return { id, ...data };
}

export async function updateStylist(db: D1Database, id: string, updates: any): Promise<Stylist | null> {
    const sets = [];
    const values = [];

    if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name); }
    if (updates.phone !== undefined) { sets.push('phone = ?'); values.push(updates.phone); }
    if (updates.working_days !== undefined) { sets.push('working_days = ?'); values.push(JSON.stringify(updates.working_days)); }
    if (updates.start_time !== undefined) { sets.push('start_time = ?'); values.push(updates.start_time); }
    if (updates.end_time !== undefined) { sets.push('end_time = ?'); values.push(updates.end_time); }
    if (updates.is_active !== undefined) { sets.push('is_active = ?'); values.push(updates.is_active ? 1 : 0); }

    if (sets.length === 0) return getStylist(db, id);

    values.push(id);
    await db.prepare(`UPDATE stylists SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
    return getStylist(db, id);
}

export async function deleteStylist(db: D1Database, id: string): Promise<void> {
    // Actually just deactivate to preserve booking history
    await db.prepare('UPDATE stylists SET is_active = 0 WHERE id = ?').bind(id).run();
}

export async function updateStylistIntegration(db: D1Database, stylistId: string, calendarId: string): Promise<void> {
    const existing = await db.prepare('SELECT id FROM stylist_integrations WHERE stylist_id = ?').bind(stylistId).first();

    if (existing) {
        await db.prepare('UPDATE stylist_integrations SET calendar_id = ?, updated_at = datetime("now") WHERE stylist_id = ?')
            .bind(calendarId, stylistId).run();
    } else {
        const id = `int-${Date.now()}`;
        await db.prepare('INSERT INTO stylist_integrations (id, stylist_id, calendar_id) VALUES (?, ?, ?)')
            .bind(id, stylistId, calendarId).run();
    }
}

// CRUD Operations for Services
export async function getServices(db: D1Database): Promise<Service[]> {
    const { results } = await db.prepare('SELECT * FROM services').all();
    return results.map((s: any) => ({
        ...s,
        created_at: new Date(s.created_at)
    }));
}

export async function getService(db: D1Database, id: string): Promise<Service | null> {
    const service: any = await db.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
    if (!service) return null;
    return {
        ...service,
        created_at: new Date(service.created_at)
    };
}

// CRUD Operations for Bookings
export async function getBookings(db: D1Database): Promise<Booking[]> {
    const { results } = await db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
    return results.map(parseBooking);
}

export async function getBooking(db: D1Database, id: string): Promise<Booking | null> {
    const booking: any = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    return booking ? parseBooking(booking) : null;
}

export async function getBookingsForStylist(
    db: D1Database,
    stylistId: string,
    date: Date
): Promise<Booking[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { results } = await db.prepare(
        `SELECT * FROM bookings 
         WHERE stylist_id = ? 
         AND status != 'cancelled' 
         AND start_time >= ? 
         AND start_time <= ?`
    ).bind(stylistId, startOfDay.toISOString(), endOfDay.toISOString()).all();

    return results.map(parseBooking);
}

export async function createBooking(db: D1Database, data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    const id = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const created_at = new Date().toISOString();

    await db.prepare(
        `INSERT INTO bookings (id, client_name, client_email, client_phone, service_id, stylist_id, start_time, end_time, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        id,
        data.client_name,
        data.client_email,
        data.client_phone,
        data.service_id,
        data.stylist_id,
        data.start_time.toISOString(),
        data.end_time.toISOString(),
        'confirmed', // Default status
        created_at
    ).run();

    // Invalidate cache
    const dateKey = data.start_time.toISOString().split('T')[0];
    const cacheKey = `${data.stylist_id}-${dateKey}`;
    availabilityCache.delete(cacheKey);

    return {
        id,
        ...data,
        status: 'confirmed',
        created_at: new Date(created_at),
        google_event_id: data.google_event_id
    };
}

export async function updateBookingStatus(
    db: D1Database,
    id: string,
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
): Promise<Booking | null> {
    await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run();

    return getBooking(db, id);
}

export async function updateBooking(
    db: D1Database,
    id: string,
    updates: Partial<Omit<Booking, 'id' | 'created_at'>>
): Promise<Booking | null> {
    const allowed = ['client_name', 'client_email', 'client_phone', 'service_id', 'stylist_id', 'start_time', 'end_time', 'status', 'google_event_id'];
    const fields = Object.keys(updates).filter(key => allowed.includes(key));

    if (fields.length === 0) return null;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
        const val = (updates as any)[field];
        return val instanceof Date ? val.toISOString() : val;
    });

    await db.prepare(`UPDATE bookings SET ${setClause} WHERE id = ?`)
        .bind(...values, id)
        .run();

    return getBooking(db, id);
}

export async function updateBookingTime(
    db: D1Database,
    id: string,
    startTime: Date,
    endTime: Date
): Promise<void> {
    await db.prepare('UPDATE bookings SET start_time = ?, end_time = ? WHERE id = ?')
        .bind(startTime.toISOString(), endTime.toISOString(), id)
        .run();

    // Invalidate cache implicitly by logic flow or could start using cache keys
}

// Availability Cache Operations (Memory)
export async function getCachedAvailability(
    stylistId: string,
    date: Date
): Promise<Date[] | null> {
    const dateKey = date.toISOString().split('T')[0];
    const cacheKey = `${stylistId}-${dateKey}`;

    const cached = availabilityCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache is still fresh (less than 5 minutes old)
    const cacheAge = Date.now() - cached.last_updated.getTime();
    if (cacheAge > 5 * 60 * 1000) {
        availabilityCache.delete(cacheKey);
        return null;
    }

    return cached.available_slots;
}

export async function setCachedAvailability(
    stylistId: string,
    date: Date,
    slots: Date[]
): Promise<void> {
    const dateKey = date.toISOString().split('T')[0];
    const cacheKey = `${stylistId}-${dateKey}`;

    availabilityCache.set(cacheKey, {
        stylist_id: stylistId,
        date: dateKey,
        available_slots: slots,
        last_updated: new Date()
    });
}

// --- New Features: Business Hours & Holidays ---

export async function getBusinessHours(db: D1Database): Promise<Map<number, { open: string, close: string, isClosed: boolean }>> {
    const { results } = await db.prepare('SELECT * FROM business_hours').all();
    const map = new Map();
    results.forEach((row: any) => {
        map.set(row.day_of_week, {
            open: row.open_time,
            close: row.close_time,
            isClosed: Boolean(row.is_closed)
        });
    });
    return map;
}

export async function updateBusinessHours(db: D1Database, day: number, open: string, close: string, isClosed: boolean): Promise<void> {
    await db.prepare(
        'INSERT INTO business_hours (day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?) ON CONFLICT(day_of_week) DO UPDATE SET open_time = excluded.open_time, close_time = excluded.close_time, is_closed = excluded.is_closed'
    ).bind(day, open, close, isClosed ? 1 : 0).run();
}

export async function getHolidays(db: D1Database, start?: Date, end?: Date): Promise<Holiday[]> {
    let query = 'SELECT * FROM holidays';
    const params: string[] = [];

    if (start && end) {
        query += ' WHERE date >= ? AND date <= ?';
        params.push(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    }

    const { results } = await db.prepare(query).bind(...params).all();

    return results.map((r: any) => ({
        id: r.id,
        date: r.date,
        reason: r.reason,
        stylist_id: r.stylist_id
    }));
}

export async function addHoliday(db: D1Database, holiday: Omit<Holiday, 'id'>): Promise<Holiday> {
    const id = `holiday-${Date.now()}`;
    await db.prepare(
        'INSERT INTO holidays (id, date, reason, stylist_id) VALUES (?, ?, ?, ?)'
    ).bind(id, holiday.date, holiday.reason, holiday.stylist_id || null).run();

    return { id, ...holiday };
}

export async function deleteHoliday(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM holidays WHERE id = ?').bind(id).run();
}

export async function getStylistIntegration(db: D1Database, stylistId: string): Promise<any> {
    const result: any = await db.prepare('SELECT * FROM stylist_integrations WHERE stylist_id = ?').bind(stylistId).first();
    return result;
}

export async function saveStylistIntegration(db: D1Database, data: any): Promise<void> {
    await db.prepare(
        `INSERT INTO stylist_integrations (id, stylist_id, google_access_token, google_refresh_token, calendar_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            google_access_token = excluded.google_access_token,
            google_refresh_token = excluded.google_refresh_token,
            calendar_id = excluded.calendar_id,
            updated_at = excluded.updated_at`
    ).bind(
        data.id || `${data.stylist_id}-google`,
        data.stylist_id,
        data.google_access_token,
        data.google_refresh_token,
        data.calendar_id,
        new Date().toISOString()
    ).run();
}
export async function getGlobalSettings(db: D1Database): Promise<Record<string, string>> {
    const { results } = await db.prepare('SELECT * FROM global_settings').all();
    const settings: Record<string, string> = {};
    results.forEach((row: any) => {
        settings[row.key] = row.value;
    });
    return settings;
}

export async function updateGlobalSetting(db: D1Database, key: string, value: string): Promise<void> {
    await db.prepare(
        'INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).bind(key, value).run();
}

// --- Chat System ---

export async function getChat(db: D1Database, clientId: string): Promise<Chat | null> {
    const chat: any = await db.prepare('SELECT * FROM chats WHERE client_id = ?').bind(clientId).first();
    return chat ? { ...chat, ai_status: chat.ai_status === 1 ? 1 : 0 } : null;
}

export async function getChatById(db: D1Database, chatId: string): Promise<Chat | null> {
    const chat: any = await db.prepare('SELECT * FROM chats WHERE id = ?').bind(chatId).first();
    return chat ? { ...chat, ai_status: chat.ai_status === 1 ? 1 : 0 } : null;
}

export async function createChat(db: D1Database, clientId: string, clientName?: string, clientPhone?: string): Promise<Chat> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(
        'INSERT INTO chats (id, client_id, client_name, client_phone, ai_status, last_message_at, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)'
    ).bind(id, clientId, clientName || null, clientPhone || null, now, now, now).run();

    return {
        id,
        client_id: clientId,
        client_name: clientName,
        client_phone: clientPhone,
        ai_status: 1,
        last_message_at: now,
        created_at: now,
        updated_at: now
    };
}

export async function updateChatStatus(db: D1Database, chatId: string, aiStatus: number): Promise<void> {
    await db.prepare('UPDATE chats SET ai_status = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(aiStatus, chatId).run();
}

export async function updateChatContact(db: D1Database, chatId: string, name?: string, phone?: string): Promise<void> {
    const sets = [];
    const values = [];

    if (name) { sets.push('client_name = ?'); values.push(name); }
    if (phone) { sets.push('client_phone = ?'); values.push(phone); }

    if (sets.length === 0) return;

    values.push(chatId);
    await db.prepare(`UPDATE chats SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...values).run();
}

export async function getBookingState(db: D1Database, chatId: string): Promise<any | null> {
    const row: any = await db.prepare('SELECT booking_state FROM chats WHERE id = ?').bind(chatId).first();
    if (!row?.booking_state) return null;
    try { return JSON.parse(row.booking_state); } catch { return null; }
}

export async function setBookingState(db: D1Database, chatId: string, state: any): Promise<void> {
    await db.prepare('UPDATE chats SET booking_state = ? WHERE id = ?')
        .bind(JSON.stringify(state), chatId).run();
}


export async function getMessages(db: D1Database, chatId: string): Promise<Message[]> {
    const { results } = await db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC').bind(chatId).all();
    return results as unknown as Message[];
}

export async function addMessage(db: D1Database, chatId: string, role: string, content: string): Promise<Message> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(
        'INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, chatId, role, content, now).run();

    await db.prepare('UPDATE chats SET last_message_at = ?, updated_at = ? WHERE id = ?').bind(now, now, chatId).run();

    return { id, chat_id: chatId, role: role as any, content, created_at: now };
}

export async function getAllChats(db: D1Database): Promise<Chat[]> {
    const { results } = await db.prepare('SELECT * FROM chats ORDER BY last_message_at DESC').all();
    return results as unknown as Chat[];
}
