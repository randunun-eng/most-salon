import {
    createBooking,
    getBookings,
    updateBookingStatus,
    getService
} from '../../lib/database';

export const onRequestGet: PagesFunction = async () => {
    try {
        const bookings = await getBookings();
        return Response.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return Response.json(
            { error: 'Failed to fetch bookings' },
            { status: 500 }
        );
    }
};

export const onRequestPost: PagesFunction = async (context) => {
    try {
        const body: any = await context.request.json();

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
            return Response.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const service = await getService(service_id);

        if (!service) {
            return Response.json(
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

        return Response.json(booking, { status: 201 });
    } catch (error) {
        console.error('Error creating booking:', error);
        return Response.json(
            { error: 'Failed to create booking' },
            { status: 500 }
        );
    }
};

export const onRequestPatch: PagesFunction = async (context) => {
    try {
        const body: any = await context.request.json();
        const { id, status } = body;

        if (!id || !status) {
            return Response.json(
                { error: 'Missing required fields: id and status' },
                { status: 400 }
            );
        }

        if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
            return Response.json(
                { error: 'Invalid status value' },
                { status: 400 }
            );
        }

        const booking = await updateBookingStatus(id, status);

        if (!booking) {
            return Response.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        return Response.json(booking);
    } catch (error) {
        console.error('Error updating booking:', error);
        return Response.json(
            { error: 'Failed to update booking' },
            { status: 500 }
        );
    }
};
