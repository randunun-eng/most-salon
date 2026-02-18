// functions/api/availability.ts
import { D1Database } from '../../lib/db-types';
import {
    getStylists,
    getStylist,
    getService,
    getBookingsForStylist,
    getCachedAvailability,
    setCachedAvailability
} from '../../lib/database';
import {
    generateSlotsForStylist,
    generateSlotsAllStylists,
    filterFutureSlots
} from '../../lib/slot-engine';
import { createGoogleCalendarClient } from '../../lib/google-calendar';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;

    try {
        const url = new URL(context.request.url);
        const dateStr = url.searchParams.get('date');
        const serviceId = url.searchParams.get('serviceId');
        const stylistId = url.searchParams.get('stylistId');

        if (!dateStr || !serviceId) {
            return Response.json({ error: 'Missing required parameters: date and serviceId' }, { status: 400 });
        }

        const date = new Date(dateStr);
        const service = await getService(db, serviceId);
        if (!service) return Response.json({ error: 'Service not found' }, { status: 404 });

        // Fetch GCal busy slots for this date (non-fatal if fails)
        let gcalBusy: { start: Date; end: Date }[] = [];
        try {
            const gcal = createGoogleCalendarClient(context.env);
            gcalBusy = await gcal.getBusySlots(date);
        } catch (e) {
            console.warn('GCal busy slots fetch failed (non-fatal):', e);
        }

        if (stylistId && stylistId !== 'any') {
            const stylist = await getStylist(db, stylistId);
            if (!stylist) return Response.json({ error: 'Stylist not found' }, { status: 404 });

            // Check cache (GCal integration means cache may be stale — skip if gcalBusy fetched)
            if (gcalBusy.length === 0) {
                const cached = await getCachedAvailability(stylistId, date);
                if (cached) {
                    return Response.json({
                        slots: filterFutureSlots(cached).map(s => s.toISOString()),
                        cached: true,
                        stylist: { id: stylist.id, name: stylist.name }
                    });
                }
            }

            const bookings = await getBookingsForStylist(db, stylistId, date);
            const slots = generateSlotsForStylist(stylist, date, service.duration_minutes, bookings, gcalBusy);

            await setCachedAvailability(stylistId, date, slots);

            return Response.json({
                slots: filterFutureSlots(slots).map(s => s.toISOString()),
                cached: false,
                stylist: { id: stylist.id, name: stylist.name }
            });
        }

        // Auto-assign mode: all stylists
        const stylists = await getStylists(db, true);
        const bookingsByStyleist = new Map();
        for (const stylist of stylists) {
            const bookings = await getBookingsForStylist(db, stylist.id, date);
            bookingsByStyleist.set(stylist.id, bookings);
        }

        const allSlots = generateSlotsAllStylists(stylists, date, service.duration_minutes, bookingsByStyleist, gcalBusy);
        const futureSlots = allSlots.filter(slot => slot.start > new Date());

        return Response.json({
            slots: futureSlots.map(slot => ({
                start: slot.start.toISOString(),
                end: slot.end.toISOString(),
                stylist_id: slot.stylist_id,
                stylist_name: slot.stylist_name
            })),
            cached: false,
            mode: 'auto-assign'
        });

    } catch (error) {
        console.error('Error fetching availability:', error);
        return Response.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
};
