import { D1Database } from '../../lib/db-types';
import {
    createBooking,
    getBookings,
    updateBookingStatus,
    getService,
    getBooking,
    updateBooking,
    getStylist
} from '../../lib/database';
import { createGoogleCalendarClient } from '../../lib/google-calendar';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;
    try {
        const bookings = await getBookings(db);
        return Response.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return Response.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
};

export const onRequestPost: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;
    try {
        const body: any = await context.request.json();
        const { client_name, client_email, client_phone, service_id, stylist_id, start_time } = body;

        if (!client_name || !client_email || !client_phone || !service_id || !stylist_id || !start_time) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const service = await getService(db, service_id);
        if (!service) return Response.json({ error: 'Service not found' }, { status: 404 });

        const stylist = await getStylist(db, stylist_id);

        const startTime = new Date(start_time);
        const endTime = new Date(startTime.getTime() + service.duration_minutes * 60 * 1000);

        const booking = await createBooking(db, {
            client_name,
            client_email,
            client_phone,
            service_id,
            stylist_id,
            start_time: startTime,
            end_time: endTime,
            status: 'confirmed'
        });

        // Push to Google Calendar
        try {
            const gcal = createGoogleCalendarClient(context.env);
            const googleEventId = await gcal.createEvent(booking, service.name, stylist?.name || 'Stylist');
            await updateBooking(db, booking.id, { google_event_id: googleEventId });
        } catch (gcalErr) {
            console.error('GCal push failed (non-fatal):', gcalErr);
        }

        return Response.json(booking, { status: 201 });
    } catch (error) {
        console.error('Error creating booking:', error);
        return Response.json({ error: 'Failed to create booking' }, { status: 500 });
    }
};

export const onRequestPatch: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;
    try {
        const body: any = await context.request.json();
        const { id, status } = body;

        if (!id || !status) return Response.json({ error: 'Missing id and status' }, { status: 400 });
        if (!['pending', 'confirmed', 'cancelled', 'completed', 'no-show'].includes(status)) {
            return Response.json({ error: 'Invalid status' }, { status: 400 });
        }

        const booking = await updateBookingStatus(db, id, status);
        if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

        // If cancelled, delete from Google Calendar
        if (status === 'cancelled') {
            try {
                const gcal = createGoogleCalendarClient(context.env);
                await gcal.deleteEvent(id);
            } catch (gcalErr) {
                console.error('GCal delete failed (non-fatal):', gcalErr);
            }
        }

        return Response.json(booking);
    } catch (error) {
        console.error('Error updating booking:', error);
        return Response.json({ error: 'Failed to update booking' }, { status: 500 });
    }
};
