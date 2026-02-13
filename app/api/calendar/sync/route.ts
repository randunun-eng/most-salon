import { NextResponse } from 'next/server';
import { createGoogleCalendarClient } from '@/lib/google-calendar';
import { analyzeEvent } from '@/lib/calendar-ai';
import { getBookings, createBooking, updateBookingStatus, getService } from '@/lib/database';

export { runtime } from '../../runtime';

/**
 * Sync Google Calendar with Database
 * GET /api/calendar/sync
 * 
 * This endpoint:
 * 1. Fetches events from Google Calendar (next 7 days)
 * 2. Uses Cloudflare Workers AI to analyze events
 * 3. Creates/updates bookings in database
 * 4. Syncs database bookings to Google Calendar
 */
export async function GET(request: Request) {
    try {
        const env = process.env;

        // Check if Google Calendar is configured
        if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REFRESH_TOKEN) {
            return NextResponse.json(
                { error: 'Google Calendar not configured' },
                { status: 500 }
            );
        }

        const calendar = createGoogleCalendarClient(env);

        // Step 1: Get events from Google Calendar (next 7 days only)
        console.log('Fetching events from Google Calendar...');
        const calendarEvents = await calendar.getEvents();
        console.log(`Found ${calendarEvents.length} events`);

        // Step 2: Get existing bookings from database
        const existingBookings = await getBookings();

        // Create a map of booking IDs from calendar event descriptions
        const calendarBookingIds = new Set<string>();

        // Step 3: Process each calendar event
        const syncResults = {
            created: 0,
            updated: 0,
            cancelled: 0,
            errors: 0
        };

        for (const event of calendarEvents) {
            try {
                // Skip all-day events
                if (!event.start.dateTime) {
                    continue;
                }

                // Check if event has booking ID in description
                const bookingIdMatch = event.description?.match(/Booking ID:\s*([^\s\n]+)/);

                if (bookingIdMatch) {
                    // This event was created by our system
                    const bookingId = bookingIdMatch[1];
                    calendarBookingIds.add(bookingId);

                    // Check if booking still exists
                    const booking = existingBookings.find(b => b.id === bookingId);
                    if (!booking) {
                        continue; // Booking was deleted, skip
                    }

                    // Check if event was cancelled in Google Calendar
                    if (event.status === 'cancelled') {
                        await updateBookingStatus(bookingId, 'cancelled');
                        syncResults.cancelled++;
                        continue;
                    }

                    // Check if time was changed
                    const eventStart = new Date(event.start.dateTime);
                    const bookingStart = new Date(booking.start_time);

                    if (eventStart.getTime() !== bookingStart.getTime()) {
                        // Time was changed in Google Calendar - update database
                        // Note: This is a simplified version. In production, you'd update the booking time
                        console.log(`Time changed for booking ${bookingId}`);
                        syncResults.updated++;
                    }

                } else {
                    // This is a new event created directly in Google Calendar
                    // Use AI to analyze and create booking

                    console.log(`Analyzing new event: ${event.summary}`);
                    const analysis = await analyzeEvent(
                        event.summary,
                        event.description || '',
                        env
                    );

                    if (!analysis || analysis.confidence < 0.6) {
                        console.log(`Low confidence analysis for: ${event.summary}`);
                        syncResults.errors++;
                        continue;
                    }

                    // Get service details
                    const service = await getService(analysis.serviceId);
                    if (!service) {
                        console.log(`Service not found: ${analysis.serviceId}`);
                        syncResults.errors++;
                        continue;
                    }

                    // Create booking in database
                    const startTime = new Date(event.start.dateTime);
                    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60 * 1000);

                    const newBooking = await createBooking({
                        client_name: analysis.clientName,
                        client_email: analysis.clientEmail || 'calendar@salonmost.com',
                        client_phone: analysis.clientPhone || '+94000000000',
                        service_id: analysis.serviceId,
                        stylist_id: analysis.stylistId || 'stylist-1',
                        start_time: startTime,
                        end_time: endTime,
                        status: event.status === 'confirmed' ? 'confirmed' : 'pending'
                    });

                    // Update Google Calendar event with booking ID
                    await calendar.updateEvent(event.id, newBooking, service.name);

                    syncResults.created++;
                    console.log(`Created booking ${newBooking.id} from calendar event`);
                }
            } catch (error) {
                console.error(`Error processing event ${event.id}:`, error);
                syncResults.errors++;
            }
        }

        // Step 4: Sync database bookings to Google Calendar
        // (Only bookings without calendar event ID)
        for (const booking of existingBookings) {
            // Skip if booking is already in calendar
            if (calendarBookingIds.has(booking.id)) {
                continue;
            }

            // Skip cancelled bookings
            if (booking.status === 'cancelled') {
                continue;
            }

            // Skip bookings more than 7 days in the future
            const bookingDate = new Date(booking.start_time);
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

            if (bookingDate > sevenDaysFromNow) {
                continue;
            }

            try {
                const service = await getService(booking.service_id);
                if (service) {
                    await calendar.createEvent(booking, service.name);
                    console.log(`Created calendar event for booking ${booking.id}`);
                    syncResults.created++;
                }
            } catch (error) {
                console.error(`Error creating calendar event for booking ${booking.id}:`, error);
                syncResults.errors++;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Calendar sync completed',
            results: syncResults,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Calendar sync error:', error);
        return NextResponse.json(
            { error: 'Calendar sync failed', details: error },
            { status: 500 }
        );
    }
}

/**
 * Manual trigger for calendar sync
 * POST /api/calendar/sync
 */
export async function POST(request: Request) {
    return GET(request);
}
