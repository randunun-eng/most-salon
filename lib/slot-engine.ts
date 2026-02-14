// Production Slot Engine - Core Logic
import { Booking, Stylist, TimeSlot } from './db-types';

/**
 * Check if two time ranges overlap
 */
export function isOverlapping(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
): boolean {
    return startA < endB && endA > startB;
}

/**
 * Parse time string (HH:MM) and combine with date
 */
export function parseTimeWithDate(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
}

/**
 * Check if a date falls on a stylist's working day
 */
export function isStylistWorkingDay(stylist: Stylist, date: Date): boolean {
    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    return stylist.working_days.includes(dayOfWeek);
}

/**
 * Generate available time slots for a stylist on a specific date
 * @param stylist - The stylist to generate slots for
 * @param date - The date to generate slots for
 * @param serviceDuration - Duration of the service in minutes
 * @param bookings - Existing bookings for this stylist on this date
 * @returns Array of available start times
 */
export function generateSlotsForStylist(
    stylist: Stylist,
    date: Date,
    serviceDuration: number,
    bookings: Booking[],
    blockedRanges: { start: Date; end: Date }[] = []
): Date[] {
    const slots: Date[] = [];
    const interval = 15; // 15-minute grid

    // Check if stylist works on this day
    if (!isStylistWorkingDay(stylist, date)) {
        return slots;
    }

    // Parse working hours
    const dayStart = parseTimeWithDate(date, stylist.start_time);
    const dayEnd = parseTimeWithDate(date, stylist.end_time);

    // Parse break times if they exist
    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;
    if (stylist.break_start && stylist.break_end) {
        breakStart = parseTimeWithDate(date, stylist.break_start);
        breakEnd = parseTimeWithDate(date, stylist.break_end);
    }

    // Generate slots on 15-minute intervals
    const currentTime = new Date(dayStart);

    while (currentTime < dayEnd) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

        // Check if slot end exceeds working hours
        if (slotEnd > dayEnd) {
            break;
        }

        let isBlocked = false;

        // Check if slot overlaps with break time
        if (breakStart && breakEnd) {
            if (isOverlapping(slotStart, slotEnd, breakStart, breakEnd)) {
                isBlocked = true;
            }
        }

        // Check internal bookings
        if (!isBlocked) {
            const hasBookingOverlap = bookings.some(booking =>
                isOverlapping(slotStart, slotEnd, new Date(booking.start_time), new Date(booking.end_time))
            );
            if (hasBookingOverlap) isBlocked = true;
        }

        // Check external blocked ranges (Google Calendar)
        if (!isBlocked) {
            const hasExternalOverlap = blockedRanges.some(range =>
                isOverlapping(slotStart, slotEnd, range.start, range.end)
            );
            if (hasExternalOverlap) isBlocked = true;
        }

        if (!isBlocked) {
            slots.push(new Date(slotStart));
        }

        currentTime.setMinutes(currentTime.getMinutes() + interval);
    }

    return slots;
}

/**
 * Generate available slots across all stylists (auto-assign mode)
 * @param stylists - All active stylists
 * @param date - The date to check availability
 * @param serviceDuration - Duration of service in minutes
 * @param bookingsByStyleist - Map of stylist_id to their bookings
 * @returns Array of time slots with stylist information
 */
export function generateSlotsAllStylists(
    stylists: Stylist[],
    date: Date,
    serviceDuration: number,
    bookingsByStyleist: Map<string, Booking[]>,
    blockedRanges: { start: Date; end: Date }[] = []
): TimeSlot[] {
    const allSlots: TimeSlot[] = [];

    for (const stylist of stylists) {
        if (!stylist.is_active) continue;

        const bookings = bookingsByStyleist.get(stylist.id) || [];
        const slots = generateSlotsForStylist(stylist, date, serviceDuration, bookings, blockedRanges);

        for (const slotStart of slots) {
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

            allSlots.push({
                start: slotStart,
                end: slotEnd,
                stylist_id: stylist.id,
                stylist_name: stylist.name
            });
        }
    }

    // Sort by time
    allSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    return allSlots;
}

/**
 * Format date to YYYY-MM-DD for cache keys
 */
export function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Check if a slot is in the past
 */
export function isSlotInPast(slotTime: Date): boolean {
    return slotTime < new Date();
}

/**
 * Filter out past slots
 */
export function filterFutureSlots(slots: Date[]): Date[] {
    const now = new Date();
    return slots.filter(slot => slot > now);
}
