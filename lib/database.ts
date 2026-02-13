// In-Memory Database (Production: Replace with PostgreSQL/Neon)
import { Stylist, Service, Booking, AvailabilityCache } from './db-types';

// In-memory storage
let stylists: Stylist[] = [];
let services: Service[] = [];
let bookings: Booking[] = [];
let availabilityCache: Map<string, AvailabilityCache> = new Map();

// Initialize with demo data
export function initializeDatabase() {
    // Stylists
    stylists = [
        {
            id: 'stylist-1',
            name: 'Sarah Johnson',
            email: 'sarah@salonmost.com',
            phone: '+94771234567',
            bio: 'Senior Hair Stylist with 10+ years experience',
            photo_url: '/images/stylist-1.jpg',
            working_days: [1, 2, 3, 4, 5, 6], // Monday to Saturday
            start_time: '09:00',
            end_time: '18:00',
            break_start: '13:00',
            break_end: '14:00',
            is_active: true,
            created_at: new Date()
        },
        {
            id: 'stylist-2',
            name: 'Michael Chen',
            email: 'michael@salonmost.com',
            phone: '+94771234568',
            bio: 'Color Specialist and Creative Director',
            photo_url: '/images/stylist-2.jpg',
            working_days: [1, 2, 3, 4, 5], // Monday to Friday
            start_time: '10:00',
            end_time: '19:00',
            break_start: '14:00',
            break_end: '15:00',
            is_active: true,
            created_at: new Date()
        },
        {
            id: 'stylist-3',
            name: 'Emma Williams',
            email: 'emma@salonmost.com',
            phone: '+94771234569',
            bio: 'Makeup Artist and Beauty Consultant',
            photo_url: '/images/stylist-3.jpg',
            working_days: [0, 2, 4, 6], // Sun, Tue, Thu, Sat
            start_time: '09:00',
            end_time: '17:00',
            is_active: true,
            created_at: new Date()
        }
    ];

    // Services
    services = [
        {
            id: 'service-1',
            name: 'Haircut & Styling',
            duration_minutes: 60,
            price: 3500,
            created_at: new Date()
        },
        {
            id: 'service-2',
            name: 'Hair Coloring',
            duration_minutes: 120,
            price: 8500,
            created_at: new Date()
        },
        {
            id: 'service-3',
            name: 'Highlights',
            duration_minutes: 90,
            price: 6500,
            created_at: new Date()
        },
        {
            id: 'service-4',
            name: 'Keratin Treatment',
            duration_minutes: 150,
            price: 12000,
            created_at: new Date()
        },
        {
            id: 'service-5',
            name: 'Makeup Application',
            duration_minutes: 45,
            price: 4500,
            created_at: new Date()
        },
        {
            id: 'service-6',
            name: 'Bridal Package',
            duration_minutes: 180,
            price: 25000,
            created_at: new Date()
        },
        {
            id: 'service-7',
            name: 'Manicure & Pedicure',
            duration_minutes: 75,
            price: 3000,
            created_at: new Date()
        },
        {
            id: 'service-8',
            name: 'Facial Treatment',
            duration_minutes: 60,
            price: 5500,
            created_at: new Date()
        }
    ];

    // Sample bookings (for testing)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    bookings = [
        {
            id: 'booking-1',
            client_name: 'Test Client',
            client_email: 'test@example.com',
            client_phone: '+94771111111',
            service_id: 'service-1',
            stylist_id: 'stylist-1',
            start_time: tomorrow,
            end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000),
            status: 'confirmed',
            created_at: new Date()
        }
    ];
}

// CRUD Operations for Stylists
export async function getStylists(activeOnly = true): Promise<Stylist[]> {
    return activeOnly ? stylists.filter(s => s.is_active) : stylists;
}

export async function getStylist(id: string): Promise<Stylist | null> {
    return stylists.find(s => s.id === id) || null;
}

// CRUD Operations for Services
export async function getServices(): Promise<Service[]> {
    return services;
}

export async function getService(id: string): Promise<Service | null> {
    return services.find(s => s.id === id) || null;
}

// CRUD Operations for Bookings
export async function getBookings(): Promise<Booking[]> {
    return bookings;
}

export async function getBooking(id: string): Promise<Booking | null> {
    return bookings.find(b => b.id === id) || null;
}

export async function getBookingsForStylist(
    stylistId: string,
    date: Date
): Promise<Booking[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return bookings.filter(b =>
        b.stylist_id === stylistId &&
        b.status !== 'cancelled' &&
        new Date(b.start_time) >= startOfDay &&
        new Date(b.start_time) <= endOfDay
    );
}

export async function createBooking(data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    const booking: Booking = {
        ...data,
        id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date()
    };

    bookings.push(booking);

    // Invalidate cache for this stylist and date
    const dateKey = booking.start_time.toISOString().split('T')[0];
    const cacheKey = `${booking.stylist_id}-${dateKey}`;
    availabilityCache.delete(cacheKey);

    return booking;
}

export async function updateBookingStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'cancelled'
): Promise<Booking | null> {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return null;

    booking.status = status;

    // Invalidate cache
    const dateKey = booking.start_time.toISOString().split('T')[0];
    const cacheKey = `${booking.stylist_id}-${dateKey}`;
    availabilityCache.delete(cacheKey);

    return booking;
}

// Availability Cache Operations
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

// Initialize on module load
initializeDatabase();
