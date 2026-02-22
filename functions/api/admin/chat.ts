
import { D1Database } from '../../../lib/db-types';
import { getAllChats, getMessages, addMessage, updateChatStatus } from '../../../lib/database';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;
    const url = new URL(context.request.url);
    const chatId = url.searchParams.get('chatId');

    try {
        if (chatId) {
            // Get messages for specific chat
            const messages = await getMessages(db, chatId);
            return Response.json(messages);
        } else {
            // List all chats
            const chats = await getAllChats(db);
            return Response.json(chats);
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch chats' }), { status: 500 });
    }
};

export const onRequestPost: PagesFunction = async (context) => {
    try {
        const { action, chatId, content, aiStatus } = await context.request.json() as any;
        const db = context.env.DB as D1Database;

        if (action === 'reply') {
            if (!chatId || !content) return new Response('Missing chatId or content', { status: 400 });

            // Admin sending a message
            const msg = await addMessage(db, chatId, 'admin', content);

            // Auto-pause AI if admin replies (optional, usually good UX)
            // await updateChatStatus(db, chatId, 0); 

            return Response.json(msg);
        }

        if (action === 'toggle_ai') {
            if (!chatId || aiStatus === undefined) return new Response('Missing params', { status: 400 });

            await updateChatStatus(db, chatId, aiStatus ? 1 : 0);
            return Response.json({ success: true, ai_status: aiStatus });
        }

        return new Response('Invalid action', { status: 400 });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Admin action failed' }), { status: 500 });
    }
};
