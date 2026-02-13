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

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const url = new URL(context.request.url);
        const dateStr = url.searchParams.get('date');
        const serviceId = url.searchParams.get('serviceId');
        const stylistId = url.searchParams.get('stylistId');

        if (!dateStr || !serviceId) {
            return Response.json(
                { error: 'Missing required parameters: date and serviceId' },
                { status: 400 }
            );
        }

        const date = new Date(dateStr);
        const service = await getService(serviceId);

        if (!service) {
            return Response.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }

        // If specific stylist requested
        if (stylistId && stylistId !== 'any') {
            const stylist = await getStylist(stylistId);
            if (!stylist) {
                return Response.json(
                    { error: 'Stylist not found' },
                    { status: 404 }
                );
            }

            // Check cache first
            const cached = await getCachedAvailability(stylistId, date);
            if (cached) {
                const futureSlots = filterFutureSlots(cached);
                return Response.json({
                    slots: futureSlots.map(s => s.toISOString()),
                    cached: true,
                    stylist: {
                        id: stylist.id,
                        name: stylist.name
                    }
                });
            }

            // Generate fresh slots
            const bookings = await getBookingsForStylist(stylistId, date);
            const slots = generateSlotsForStylist(
                stylist,
                date,
                service.duration_minutes,
                bookings
            );

            // Cache the results
            await setCachedAvailability(stylistId, date, slots);

            const futureSlots = filterFutureSlots(slots);
            return Response.json({
                slots: futureSlots.map(s => s.toISOString()),
                cached: false,
                stylist: {
                    id: stylist.id,
                    name: stylist.name
                }
            });
        }

        // Auto-assign mode: check all stylists
        const stylists = await getStylists(true);
        const bookingsByStyleist = new Map();

        for (const stylist of stylists) {
            const bookings = await getBookingsForStylist(stylist.id, date);
            bookingsByStyleist.set(stylist.id, bookings);
        }

        const allSlots = generateSlotsAllStylists(
            stylists,
            date,
            service.duration_minutes,
            bookingsByStyleist
        );

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
        return Response.json(
            { error: 'Failed to fetch availability' },
            { status: 500 }
        );
    }
};
