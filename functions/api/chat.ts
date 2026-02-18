
import { D1Database } from '../../lib/db-types';
import { getChat, getChatById, createChat, addMessage, getMessages, updateChatContact, getService, getStylist, createBooking, updateBooking, getGlobalSettings } from '../../lib/database';
import { generateAIResponse, extractContactInfo, extractBookingIntent } from '../../lib/chat-agent';
import { createGoogleCalendarClient } from '../../lib/google-calendar';

export const onRequestPost: PagesFunction = async (context) => {
    try {
        const { messages, chatId, clientId } = await context.request.json() as any;
        const env = context.env;
        const db = env.DB as D1Database; // Assuming DB binding is 'DB'

        if (!messages || !Array.isArray(messages)) {
            return new Response('Invalid request body', { status: 400 });
        }

        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage.role !== 'user') {
            return new Response('Last message must be from user', { status: 400 });
        }

        // 1. Resolve Chat Session
        let chat = chatId ? await getChatById(db, chatId) : await getChat(db, clientId);

        if (!chat) {
            // New session
            chat = await createChat(db, clientId);
        }

        // 2. Save User Message
        await addMessage(db, chat.id, 'user', lastUserMessage.content);

        // 3. Check for Contact Info (Lead Gen)
        const contactInfo = await extractContactInfo(lastUserMessage.content, env);
        if (contactInfo) {
            await updateChatContact(db, chat.id, contactInfo.name, contactInfo.phone);
        }

        // 4. Handle Response logic
        if (chat.ai_status === 1) {
            // AI Mode: Active
            const history = await getMessages(db, chat.id);
            // Convert DB messages to simplified format for AI
            const historySimple = history.map(m => ({ role: m.role, content: m.content }));

            // Check if booking was already created in this conversation
            const alreadyBooked = historySimple.some(m => m.content.includes('[SYSTEM: BOOKING SUCCESSFULLY CREATED]'));

            let augmentedMessage = lastUserMessage.content;

            if (!alreadyBooked) {
                // Check if AI has collected all required booking details
                const bookingIntent = await extractBookingIntent(historySimple, env, db);
                if (bookingIntent) {
                    try {
                        const service = await getService(db, bookingIntent.serviceId);
                        const duration = service?.duration_minutes || 60;
                        const startTime = new Date(bookingIntent.dateTime);
                        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

                        const booking = await createBooking(db, {
                            client_name: bookingIntent.name,
                            client_email: '',
                            client_phone: bookingIntent.phone,
                            service_id: bookingIntent.serviceId,
                            stylist_id: bookingIntent.stylistId,
                            start_time: startTime,
                            end_time: endTime,
                            status: 'confirmed',
                        });

                        // Push to Google Calendar (non-fatal)
                        try {
                            const service = await getService(db, bookingIntent.serviceId);
                            const stylist = await getStylist(db, bookingIntent.stylistId);
                            const gcal = createGoogleCalendarClient(env);
                            const googleEventId = await gcal.createEvent(booking, service?.name || 'Service', stylist?.name || 'Stylist');
                            await updateBooking(db, booking.id, { google_event_id: googleEventId });
                        } catch (gcalErr) {
                            console.error('GCal push from chat failed (non-fatal):', gcalErr);
                        }

                        // Build WhatsApp link to owner
                        let waLink = '';
                        try {
                            const settings = await getGlobalSettings(db);
                            const ownerPhone = settings['owner_whatsapp'];
                            if (ownerPhone) {
                                const waMessage = encodeURIComponent(
                                    `New booking confirmed!\nClient: ${bookingIntent.name}\nPhone: ${bookingIntent.phone}\nTime: ${new Date(bookingIntent.dateTime).toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}\nRef: ${booking.id}`
                                );
                                waLink = ` To notify us on WhatsApp, tap: https://wa.me/${ownerPhone.replace(/[^0-9]/g, '')}?text=${waMessage}`;
                            }
                        } catch (waErr) {
                            console.error('WhatsApp link generation failed (non-fatal):', waErr);
                        }

                        augmentedMessage = `[SYSTEM: BOOKING SUCCESSFULLY CREATED - Ref: ${booking.id}]${waLink}\n${lastUserMessage.content}`;
                    } catch (err) {
                        console.error('Booking creation error:', err);
                        augmentedMessage = `[SYSTEM: NO BOOKING - Could not create booking, please try again]\n${lastUserMessage.content}`;
                    }
                }
            }

            const aiResponseText = await generateAIResponse(augmentedMessage, historySimple, env, db);

            // Save AI Message
            const savedMsg = await addMessage(db, chat.id, 'assistant', aiResponseText);

            return Response.json({
                chatId: chat.id,
                message: savedMsg
            });

        } else {
            // Human Mode: Paused
            // Return empty response or specific status indicating "waiting for human"
            // For now, we return success but no new message, frontend stays silent
            return Response.json({
                chatId: chat.id,
                status: 'waiting_for_agent'
            });
        }

    } catch (error) {
        console.error('Chat API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const onRequestGet: PagesFunction = async (context) => {
    const url = new URL(context.request.url);
    const chatId = url.searchParams.get('chatId');
    const clientId = url.searchParams.get('clientId');
    const db = context.env.DB as D1Database;

    if (!chatId && !clientId) return new Response('Missing chatId or clientId', { status: 400 });

    try {
        let chat = chatId ? await getChatById(db, chatId) : await getChat(db, clientId);

        if (!chat) return Response.json({ messages: [], chatId: null });

        const messages = await getMessages(db, chat.id);

        return Response.json({
            chatId: chat.id,
            messages,
            ai_status: chat.ai_status
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch history' }), { status: 500 });
    }
}
