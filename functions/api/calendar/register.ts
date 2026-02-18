// functions/api/calendar/register.ts
import { D1Database } from '../../../lib/db-types';
import { updateGlobalSetting } from '../../../lib/database';
import { createGoogleCalendarClient } from '../../../lib/google-calendar';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;

    try {
        const gcal = createGoogleCalendarClient(context.env);

        // Determine the webhook URL (our Pages domain + /api/calendar/webhook)
        const url = new URL(context.request.url);
        const webhookUrl = `${url.protocol}//${url.host}/api/calendar/webhook`;

        const channelId = `salon-most-${Date.now()}`;
        const resourceId = await gcal.watchCalendar(webhookUrl, channelId);

        await updateGlobalSetting(db, 'gcal_channel_id', channelId);
        await updateGlobalSetting(db, 'gcal_resource_id', resourceId);
        // Clear sync token so next webhook fetch starts fresh
        await updateGlobalSetting(db, 'gcal_sync_token', '');

        return Response.json({
            success: true,
            webhookUrl,
            channelId,
            resourceId,
            note: 'Webhook registered. Re-call this endpoint every 7 days.'
        });

    } catch (error) {
        console.error('Register error:', error);
        return Response.json({ error: 'Failed to register webhook', details: String(error) }, { status: 500 });
    }
};
