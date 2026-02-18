// functions/api/calendar/sync.ts
import { D1Database } from '../../../lib/db-types';
import { createGoogleCalendarClient } from '../../../lib/google-calendar';
import { analyzeEvent } from '../../../lib/calendar-ai';
import { getBookings, createBooking, updateBookingStatus } from '../../../lib/database';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;

    try {
        const gcal = createGoogleCalendarClient(context.env);
        const events = await gcal.getEvents();
        const dbBookings = await getBookings(db);

        let syncedCount = 0;
        const newBookings = [];

        for (const event of events) {
            if (event.status === 'cancelled') continue;

            // Skip events we created (they have "Booking ID:" in description)
            if (event.description?.includes('Booking ID:')) continue;

            const analysis = await analyzeEvent(event.summary, event.description || '', context.env);
            if (!analysis || analysis.confidence < 0.7) continue;

            const eventStart = event.start.dateTime || event.start.date || '';
            const existing = dbBookings.find(b =>
                (b.client_phone === analysis.clientPhone) &&
                Math.abs(new Date(b.start_time).getTime() - new Date(eventStart).getTime()) < 60000
            );

            if (existing) {
                if (existing.status !== 'confirmed' && event.status === 'confirmed') {
                    await updateBookingStatus(db, existing.id, 'confirmed');
                    syncedCount++;
                }
                continue;
            }

            if (!event.start.dateTime || !event.end.dateTime) continue;

            const newBooking = await createBooking(db, {
                client_name: analysis.clientName || 'Calendar Guest',
                client_email: '',
                client_phone: analysis.clientPhone || '',
                service_id: analysis.serviceId || '',
                stylist_id: analysis.stylistId || '',
                start_time: new Date(event.start.dateTime),
                end_time: new Date(event.end.dateTime),
                status: event.status === 'confirmed' ? 'confirmed' : 'pending'
            });

            newBookings.push(newBooking);
            syncedCount++;
        }

        return Response.json({
            success: true,
            synced: syncedCount,
            new_bookings: newBookings.length,
            events_scanned: events.length
        });

    } catch (error) {
        console.error('Sync Error:', error);
        return Response.json({ error: 'Calendar sync failed', details: String(error) }, { status: 500 });
    }
};
