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

    // Sample bookings (for testing slot blocking)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Sarah Johnson (stylist-1) - Busy morning
    const sarah10am = new Date(tomorrow);
    sarah10am.setHours(10, 0, 0, 0);

    const sarah11am = new Date(tomorrow);
    sarah11am.setHours(11, 0, 0, 0);

    const sarah2pm = new Date(tomorrow);
    sarah2pm.setHours(14, 0, 0, 0);

    // Michael Chen (stylist-2) - Busy afternoon
    const michael2pm = new Date(tomorrow);
    michael2pm.setHours(14, 0, 0, 0);

    const michael4pm = new Date(tomorrow);
    michael4pm.setHours(16, 0, 0, 0);

    // Emma Williams (stylist-3) - Morning booking
    const emma9am = new Date(tomorrow);
    emma9am.setHours(9, 0, 0, 0);

    bookings = [
        // Sarah's bookings - 10 AM (60 min haircut)
        {
            id: 'booking-sarah-1',
            client_name: 'Alice Brown',
            client_email: 'alice@example.com',
            client_phone: '+94771111111',
            service_id: 'service-1', // Haircut 60 min
            stylist_id: 'stylist-1',
            start_time: sarah10am,
            end_time: new Date(sarah10am.getTime() + 60 * 60 * 1000),
            status: 'confirmed',
            created_at: new Date()
        },
        // Sarah's bookings - 11 AM (90 min highlights)
        {
            id: 'booking-sarah-2',
            client_name: 'Bob Smith',
            client_email: 'bob@example.com',
            client_phone: '+94772222222',
            service_id: 'service-3', // Highlights 90 min
            stylist_id: 'stylist-1',
            start_time: sarah11am,
            end_time: new Date(sarah11am.getTime() + 90 * 60 * 1000),
            status: 'confirmed',
            created_at: new Date()
        },
        // Sarah's bookings - 2 PM (120 min coloring)
        {
            id: 'booking-sarah-3',
            client_name: 'Carol White',
            client_email: 'carol@example.com',
            client_phone: '+94773333333',
            service_id: 'service-2', // Hair Coloring 120 min
            stylist_id: 'stylist-1',
            start_time: sarah2pm,
            end_time: new Date(sarah2pm.getTime() + 120 * 60 * 1000),
            status: 'confirmed',
            created_at: new Date()
        },
        // Michael's bookings - 2 PM (60 min haircut)
        {
            id: 'booking-michael-1',
            client_name: 'David Lee',
            client_email: 'david@example.com',
            client_phone: '+94774444444',
            service_id: 'service-1', // Haircut 60 min
            stylist_id: 'stylist-2',
            start_time: michael2pm,
            end_time: new Date(michael2pm.getTime() + 60 * 60 * 1000),
            status: 'confirmed',
            created_at: new Date()
        },
        // Michael's bookings - 4 PM (90 min highlights)
        {
            id: 'booking-michael-2',
            client_name: 'Eva Martinez',
            client_email: 'eva@example.com',
            client_phone: '+94775555555',
            service_id: 'service-3', // Highlights 90 min
            stylist_id: 'stylist-2',
            start_time: michael4pm,
            end_time: new Date(michael4pm.getTime() + 90 * 60 * 1000),
            status: 'confirmed',
            created_at: new Date()
        },
        // Emma's bookings - 9 AM (45 min makeup)
        {
            id: 'booking-emma-1',
            client_name: 'Fiona Green',
            client_email: 'fiona@example.com',
            client_phone: '+94776666666',
            service_id: 'service-5', // Makeup 45 min
            stylist_id: 'stylist-3',
            start_time: emma9am,
            end_time: new Date(emma9am.getTime() + 45 * 60 * 1000),
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
