// Cloudflare Worker for automatic calendar sync every 10 minutes
// Deploy this to Cloudflare Workers with cron trigger

export interface Env {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REFRESH_TOKEN: string;
    GOOGLE_CALENDAR_ID: string;
    CLOUDFLARE_ACCOUNT_ID: string;
    CLOUDFLARE_AI_TOKEN: string;
    SYNC_API_URL: string; // https://most-salon.pages.dev/api/calendar/sync
}

export default {
    /**
     * Scheduled event handler - runs every 10 minutes
     */
    async scheduled(
        event: ScheduledEvent,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        console.log('Starting scheduled calendar sync...');

        try {
            // Call the sync API endpoint
            const response = await fetch(env.SYNC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cron-Secret': env.CRON_SECRET || 'default-secret'
                }
            });

            const result = await response.json();

            if (response.ok) {
                console.log('Calendar sync successful:', result);
            } else {
                console.error('Calendar sync failed:', result);
            }
        } catch (error) {
            console.error('Error during scheduled sync:', error);
        }
    },

    /**
     * HTTP handler for manual triggers
     */
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {

        // Only allow POST requests
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        // Verify secret token
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        try {
            // Trigger sync
            const response = await fetch(env.SYNC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            return new Response(JSON.stringify({
                success: true,
                message: 'Manual sync triggered',
                result: result
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Sync failed',
                details: error
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};
