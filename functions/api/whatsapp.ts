export const onRequestPost: PagesFunction = async (context) => {
    try {
        const { phone, message, bookingDetails }: any = await context.request.json();

        // Format the WhatsApp message
        const whatsappMessage = `🎉 *SALON MOST - Booking Confirmation*\n\n` +
            `👤 *Client:* ${bookingDetails.clientName}\n` +
            `📞 *Phone:* ${bookingDetails.clientPhone}\n` +
            `💇 *Service:* ${bookingDetails.serviceName}\n` +
            `👨‍💼 *Stylist:* ${bookingDetails.stylistName}\n` +
            `📅 *Date:* ${bookingDetails.date}\n` +
            `⏰ *Time:* ${bookingDetails.time}\n` +
            `💰 *Price:* LKR ${bookingDetails.price}\n\n` +
            `📍 *Location:* 762 Pannipitiya Road, Battaramulla\n\n` +
            `✅ Your booking is confirmed!\n` +
            `We look forward to seeing you!\n\n` +
            `_Booking ID: ${bookingDetails.bookingId}_`;

        console.log('WhatsApp Message:', whatsappMessage);
        console.log('Sending to:', phone);

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

        return Response.json({
            success: true,
            message: 'WhatsApp notification prepared',
            waLink: waLink,
            preview: whatsappMessage,
            note: 'For testing: Use the waLink to send via WhatsApp Web.'
        });

    } catch (error) {
        console.error('WhatsApp API Error:', error);
        return Response.json(
            { error: 'Failed to send WhatsApp notification', details: error },
            { status: 500 }
        );
    }
};
