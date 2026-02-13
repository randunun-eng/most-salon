import { createGoogleCalendarClient } from '../../../lib/google-calendar';
import { analyzeEvent } from '../../../lib/calendar-ai';
import { getBookings, createBooking, updateBookingStatus, getService } from '../../../lib/database';

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const env = context.env;
        const calendar = createGoogleCalendarClient(env);
        const events = await calendar.getEvents();
        const dbBookings = await getBookings();

        let syncedCount = 0;
        let newBookings = [];

        for (const event of events) {
            // Check if event already exists in DB (by ID description check or fuzzy match)
            // Simplified logic: Check if we have a booking at this time for this stylist
            // Actually, we need to parse the event first to know who it is for.

            // Analyze event with AI
            const analysis = await analyzeEvent(
                event.summary,
                event.description || '',
                env
            );

            if (!analysis) {
                console.log('Skipping unanalyzable event:', event.summary);
                continue;
            }

            // Check for existing booking
            const existing = dbBookings.find(b =>
                (b.client_email === analysis.clientEmail || b.client_phone === analysis.clientPhone) &&
                Math.abs(new Date(b.start_time).getTime() - new Date(event.start.dateTime).getTime()) < 60000 // within 1 min
            );

            if (existing) {
                // Update status if changed
                if (existing.status !== 'confirmed' && event.status === 'confirmed') {
                    await updateBookingStatus(existing.id, 'confirmed');
                    syncedCount++;
                }
                continue;
            }

            // Create new booking from Calendar Event
            if (analysis.confidence > 0.7) {
                const start = new Date(event.start.dateTime);
                const end = new Date(event.end.dateTime);

                const newBooking = await createBooking({
                    client_name: analysis.clientName || 'Calendar Guest',
                    client_email: analysis.clientEmail || 'no-email@example.com',
                    client_phone: analysis.clientPhone || '0000000000',
                    service_id: analysis.serviceId,
                    stylist_id: analysis.stylistId || 'stylist-1',
                    start_time: start,
                    end_time: end,
                    status: event.status === 'confirmed' ? 'confirmed' : 'pending'
                });
                newBookings.push(newBooking);
                syncedCount++;
            }
        }

        return Response.json({
            success: true,
            synced: syncedCount,
            new_bookings: newBookings.length,
            events_scanned: events.length
        });

    } catch (error) {
        console.error('Sync Error:', error);
        return Response.json(
            { error: 'Calendar sync failed', details: error },
            { status: 500 }
        );
    }
};
