// functions/api/calendar/webhook.ts
import { D1Database } from '../../../lib/db-types';
import { getGlobalSettings, updateGlobalSetting } from '../../../lib/database';
import { createGoogleCalendarClient } from '../../../lib/google-calendar';
import { analyzeEventChange } from '../../../lib/calendar-ai';

export const onRequestPost: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;

    try {
        // 1. Verify this is a legitimate Google push
        const channelId = context.request.headers.get('X-Goog-Channel-Id');
        const resourceState = context.request.headers.get('X-Goog-Resource-State');

        const settings = await getGlobalSettings(db);
        const storedChannelId = settings['gcal_channel_id'];

        // First notification is always 'sync' — just acknowledge
        if (resourceState === 'sync') {
            return new Response('OK', { status: 200 });
        }

        // Reject if channel ID doesn't match what we registered
        if (storedChannelId && channelId !== storedChannelId) {
            console.warn('Webhook: unknown channel ID', channelId);
            return new Response('Forbidden', { status: 403 });
        }

        // 2. Fetch changed events using sync token (incremental sync)
        const gcal = createGoogleCalendarClient(context.env);
        const accessToken = await (gcal as any).getAccessToken();

        const syncToken = settings['gcal_sync_token'];
        const params: Record<string, string> = {
            singleEvents: 'true',
            showDeleted: 'true'
        };
        if (syncToken) params.syncToken = syncToken;
        else {
            // Fallback: last 24 hours
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            params.timeMin = yesterday;
        }

        const eventsRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${context.env.GOOGLE_CALENDAR_ID}/events?${new URLSearchParams(params)}`,
            { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
        );
        const eventsData = await eventsRes.json();

        // 3. Store new sync token for next time
        if (eventsData.nextSyncToken) {
            await updateGlobalSetting(db, 'gcal_sync_token', eventsData.nextSyncToken);
        }

        // 4. Process each changed event
        const results = [];
        for (const event of (eventsData.items || [])) {
            const result = await analyzeEventChange(event, db, context.env);
            results.push(result);
        }

        console.log('Webhook processed:', results);
        return Response.json({ ok: true, processed: results.length });

    } catch (error) {
        console.error('Webhook error:', error);
        // Always return 200 to Google (else it will stop sending)
        return new Response('OK', { status: 200 });
    }
};

// Google sends a HEAD request to verify endpoint is reachable
export const onRequestHead: PagesFunction = async () => {
    return new Response(null, { status: 200 });
};
