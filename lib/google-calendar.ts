// Google Calendar API Client for Cloudflare Workers
import { Booking } from './db-types';

interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    status: 'confirmed' | 'tentative' | 'cancelled';
    updated: string;
}

interface CalendarConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    calendarId: string;
}

export class GoogleCalendarClient {
    private config: CalendarConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(config: CalendarConfig) {
        this.config = config;
    }

    /**
     * Get access token (refresh if expired)
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken as string;
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                refresh_token: this.config.refreshToken,
                grant_type: 'refresh_token'
            })
        });

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000) - 60000; // 1 min buffer

        return this.accessToken || '';
    }

    /**
     * Get events from Google Calendar (next 7 days only)
     */
    async getEvents(): Promise<GoogleCalendarEvent[]> {
        const token = await this.getAccessToken();

        const now = new Date();
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(now.getDate() + 7);

        const params = new URLSearchParams({
            timeMin: now.toISOString(),
            timeMax: sevenDaysLater.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '100'
        });

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        );

        const data = await response.json();
        return data.items || [];
    }

    /**
     * Get busy slots for a specific date (9AM - 7PM, ignoring personal life)
     */
    async getBusySlots(date: Date): Promise<{ start: Date; end: Date; bookingId?: string }[]> {
        const token = await this.getAccessToken();

        const startOfDay = new Date(date);
        startOfDay.setHours(9, 0, 0, 0); // 9:00 AM

        const endOfDay = new Date(date);
        endOfDay.setHours(19, 0, 0, 0); // 7:00 PM

        const params = new URLSearchParams({
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime'
        });

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        );

        const data = await response.json();

        if (!data.items) return [];

        return data.items.map((event: any) => {
            const start = new Date(event.start.dateTime || event.start.date || '');
            const end = new Date(event.end.dateTime || event.end.date || '');

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return null; // Filter out invalid dates
            }

            const result: { start: Date; end: Date; bookingId?: string } = {
                start: start,
                end: end
            };

            // Extract booking ID if present
            if (event.description) {
                const match = event.description.match(/Booking ID: (booking-[a-zA-Z0-9-]+)/);
                if (match) {
                    result.bookingId = match[1];
                }
            }

            return result;
        }).filter((slot: any) => slot !== null) as { start: Date; end: Date; bookingId?: string }[];
    }

    /**
     * Create event in Google Calendar
     */
    async createEvent(booking: Booking, serviceName: string, stylistName: string): Promise<string> {
        const token = await this.getAccessToken();

        const event = {
            summary: `${serviceName} (${stylistName}) - ${booking.client_name}`,
            description: `Client: ${booking.client_name}\nPhone: ${booking.client_phone}\nEmail: ${booking.client_email}\nStylist: ${stylistName}\nBooking ID: ${booking.id}`,
            start: {
                dateTime: new Date(booking.start_time).toISOString(),
                timeZone: 'Asia/Colombo'
            },
            end: {
                dateTime: new Date(booking.end_time).toISOString(),
                timeZone: 'Asia/Colombo'
            },
            status: booking.status === 'confirmed' ? 'confirmed' : 'tentative'
        };

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            }
        );

        const data = await response.json();
        return data.id;
    }

    /**
     * Update event in Google Calendar (Finds event effectively by Booking ID)
     */
    async updateEvent(booking: Booking, serviceName: string, stylistName: string): Promise<void> {
        const token = await this.getAccessToken();

        // 1. Search for the event by Booking ID
        const searchParams = new URLSearchParams({
            q: `Booking ID: ${booking.id}`,
            singleEvents: 'true'
        });

        const searchRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events?${searchParams}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const searchData = await searchRes.json();
        const event = searchData.items?.[0];

        if (!event) {
            console.log(`Event for booking ${booking.id} not found in GCal`);
            return;
        }

        // 2. Update the event
        const eventBody = {
            summary: `${serviceName} (${stylistName}) - ${booking.client_name}`,
            description: `Client: ${booking.client_name}\nPhone: ${booking.client_phone}\nEmail: ${booking.client_email}\nStylist: ${stylistName}\nBooking ID: ${booking.id}`,
            start: {
                dateTime: new Date(booking.start_time).toISOString(),
                timeZone: 'Asia/Colombo'
            },
            end: {
                dateTime: new Date(booking.end_time).toISOString(),
                timeZone: 'Asia/Colombo'
            },
            status: booking.status === 'confirmed' ? 'confirmed' : 'tentative'
        };

        const updateRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events/${event.id}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventBody)
            }
        );

        if (!updateRes.ok) {
            console.error('Failed to update GCal event', await updateRes.text());
        }
    }

    /**
     * Delete event from Google Calendar (Finds event effectively by Booking ID)
     */
    async deleteEvent(bookingId: string): Promise<void> {
        const token = await this.getAccessToken();

        // 1. Search for the event by Booking ID
        const searchParams = new URLSearchParams({
            q: `Booking ID: ${bookingId}`,
            singleEvents: 'true'
        });

        const searchRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events?${searchParams}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const searchData = await searchRes.json();
        const event = searchData.items?.[0];

        if (!event) return;

        await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events/${event.id}`,
            {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
    }

    /**
     * Watch calendar for changes (webhook)
     */
    async watchCalendar(webhookUrl: string): Promise<string> {
        const token = await this.getAccessToken();

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events/watch`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: `salon-most-${Date.now()}`,
                    type: 'web_hook',
                    address: webhookUrl,
                    expiration: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
                })
            }
        );

        const data = await response.json();
        return data.resourceId;
    }
}

/**
 * Initialize Google Calendar client from environment variables
 */
export function createGoogleCalendarClient(env: any): GoogleCalendarClient {
    return new GoogleCalendarClient({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        refreshToken: env.GOOGLE_REFRESH_TOKEN,
        calendarId: env.GOOGLE_CALENDAR_ID || 'primary'
    });
}
