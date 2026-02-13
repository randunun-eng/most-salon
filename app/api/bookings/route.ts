// API Route: Create and manage bookings
import { NextResponse } from 'next/server';
import { createBooking, getBookings, updateBookingStatus } from '@/lib/database';

export async function GET() {
    try {
        const bookings = await getBookings();
        return NextResponse.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bookings' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            client_name,
            client_email,
            client_phone,
            service_id,
            stylist_id,
            start_time
        } = body;

        // Validation
        if (!client_name || !client_email || !client_phone || !service_id || !stylist_id || !start_time) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get service to calculate end time
        const { getService } = await import('@/lib/database');
        const service = await getService(service_id);

        if (!service) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }

        const startTime = new Date(start_time);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration_minutes);

        const booking = await createBooking({
            client_name,
            client_email,
            client_phone,
            service_id,
            stylist_id,
            start_time: startTime,
            end_time: endTime,
            status: 'confirmed'
        });

        // TODO: Send confirmation email
        // TODO: Send WhatsApp notification
        // TODO: Create Google Calendar event

        return NextResponse.json(booking, { status: 201 });
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json(
            { error: 'Failed to create booking' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: id and status' },
                { status: 400 }
            );
        }

        if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status value' },
                { status: 400 }
            );
        }

        const booking = await updateBookingStatus(id, status);

        if (!booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(booking);
    } catch (error) {
        console.error('Error updating booking:', error);
        return NextResponse.json(
            { error: 'Failed to update booking' },
            { status: 500 }
        );
    }
}
