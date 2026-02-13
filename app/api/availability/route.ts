// API Route: Get available slots
import { NextResponse } from 'next/server';
import {
    getStylists,
    getStylist,
    getService,
    getBookingsForStylist,
    getCachedAvailability,
    setCachedAvailability
} from '@/lib/database';
import {
    generateSlotsForStylist,
    generateSlotsAllStylists,
    filterFutureSlots
} from '@/lib/slot-engine';

export const runtime = 'edge';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');
        const serviceId = searchParams.get('serviceId');
        const stylistId = searchParams.get('stylistId');

        if (!dateStr || !serviceId) {
            return NextResponse.json(
                { error: 'Missing required parameters: date and serviceId' },
                { status: 400 }
            );
        }

        const date = new Date(dateStr);
        const service = await getService(serviceId);

        if (!service) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }

        // If specific stylist requested
        if (stylistId && stylistId !== 'any') {
            const stylist = await getStylist(stylistId);
            if (!stylist) {
                return NextResponse.json(
                    { error: 'Stylist not found' },
                    { status: 404 }
                );
            }

            // Check cache first
            const cached = await getCachedAvailability(stylistId, date);
            if (cached) {
                const futureSlots = filterFutureSlots(cached);
                return NextResponse.json({
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
            return NextResponse.json({
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

        return NextResponse.json({
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
        return NextResponse.json(
            { error: 'Failed to fetch availability' },
            { status: 500 }
        );
    }
}
