import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { phone, message, bookingDetails } = await request.json();

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

        // For testing: Log the message
        console.log('WhatsApp Message:', whatsappMessage);
        console.log('Sending to:', phone);

        // Option 1: Use WhatsApp Business API (requires setup)
        // const whatsappApiUrl = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        // const response = await fetch(whatsappApiUrl, {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     messaging_product: 'whatsapp',
        //     to: phone.replace('+', ''),
        //     type: 'text',
        //     text: { body: whatsappMessage }
        //   })
        // });

        // Option 2: Use wa.me link (for testing - opens WhatsApp)
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

        // Option 3: Use third-party service like Twilio
        // const twilioResponse = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
        //     'Content-Type': 'application/x-www-form-urlencoded',
        //   },
        //   body: new URLSearchParams({
        //     From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        //     To: `whatsapp:${phone}`,
        //     Body: whatsappMessage
        //   })
        // });

        return NextResponse.json({
            success: true,
            message: 'WhatsApp notification prepared',
            waLink: waLink,
            preview: whatsappMessage,
            note: 'For testing: Use the waLink to send via WhatsApp Web. For production: Configure WhatsApp Business API or Twilio.'
        });

    } catch (error) {
        console.error('WhatsApp API Error:', error);
        return NextResponse.json(
            { error: 'Failed to send WhatsApp notification', details: error },
            { status: 500 }
        );
    }
}
