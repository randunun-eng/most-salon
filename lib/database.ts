// Cloudflare D1 Database Integration
import { Stylist, Service, Booking, AvailabilityCache, D1Database } from './db-types';

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
        ? 'SELECT * FROM stylists WHERE is_active = 1'
        : 'SELECT * FROM stylists';

    const { results } = await db.prepare(query).all();
    return results.map(parseStylist);
}

export async function getStylist(db: D1Database, id: string): Promise<Stylist | null> {
    const stylist: any = await db.prepare('SELECT * FROM stylists WHERE id = ?').bind(id).first();
    return stylist ? parseStylist(stylist) : null;
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
        created_at: new Date(created_at)
    };
}

export async function updateBookingStatus(
    db: D1Database,
    id: string,
    status: 'pending' | 'confirmed' | 'cancelled'
): Promise<Booking | null> {
    await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run();

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
