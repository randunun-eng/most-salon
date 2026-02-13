// Google Calendar API Client for Cloudflare Workers
import { Booking } from './db-types';

interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
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
            return this.accessToken;
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
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

        return this.accessToken;
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
     * Create event in Google Calendar
     */
    async createEvent(booking: Booking, serviceName: string): Promise<string> {
        const token = await this.getAccessToken();

        const event = {
            summary: `${serviceName} - ${booking.client_name}`,
            description: `Phone: ${booking.client_phone}\nEmail: ${booking.client_email}\nBooking ID: ${booking.id}`,
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
     * Update event in Google Calendar
     */
    async updateEvent(eventId: string, booking: Booking, serviceName: string): Promise<void> {
        const token = await this.getAccessToken();

        const event = {
            summary: `${serviceName} - ${booking.client_name}`,
            description: `Phone: ${booking.client_phone}\nEmail: ${booking.client_email}\nBooking ID: ${booking.id}`,
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

        await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events/${eventId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            }
        );
    }

    /**
     * Delete event from Google Calendar
     */
    async deleteEvent(eventId: string): Promise<void> {
        const token = await this.getAccessToken();

        await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.config.calendarId}/events/${eventId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
