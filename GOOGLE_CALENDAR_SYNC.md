# Google Calendar Sync Implementation Guide

## Overview
Two-way sync between Google Calendar and booking system using Cloudflare Workers AI for intelligent event analysis.

## Architecture

```
Google Calendar <-> Cloudflare Worker <-> Workers AI <-> Database <-> Website
```

## Setup Steps

### 1. Google Calendar API Setup

1. Go to https://console.cloud.google.com
2. Create new project: "Salon MOST Booking"
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://most-salon.pages.dev/api/auth/google`
6. Download credentials JSON

### 2. Required Environment Variables

Add to Cloudflare Pages:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_ID=primary
GOOGLE_REFRESH_TOKEN=your_refresh_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_AI_TOKEN=your_ai_token
```

### 3. Cloudflare Workers AI Setup

We'll use **@cf/meta/llama-3-8b-instruct** for calendar event analysis.

## Implementation Files

### File 1: `/workers/calendar-sync.ts`
Cloudflare Worker that runs every 10 minutes

### File 2: `/app/api/calendar/sync/route.ts`
API endpoint for manual sync

### File 3: `/app/api/calendar/webhook/route.ts`
Google Calendar webhook receiver

### File 4: `/lib/google-calendar.ts`
Google Calendar API client

### File 5: `/lib/calendar-ai.ts`
Cloudflare Workers AI integration

## Features

1. **Two-way Sync (Every 10 minutes)**
   - Google Calendar → Database
   - Database → Google Calendar

2. **AI-Powered Event Analysis**
   - Parse natural language events
   - Extract service type, duration, client info
   - Handle cancellations and reschedules

3. **Conflict Resolution**
   - Last-modified wins
   - AI analyzes intent for complex cases

4. **7-Day Booking Window**
   - Only sync events within next 7 days
   - Automatically archive older events

## Google Calendar Event Format

Owner can create events like:
```
Title: "Haircut - John Doe"
Description: "Phone: +94779336857"
Time: 2:00 PM - 3:00 PM
```

AI will parse and create booking automatically.

## Next Steps

1. Set up Google Calendar API credentials
2. Deploy Cloudflare Worker
3. Configure cron trigger (every 10 minutes)
4. Test two-way sync
5. Enable AI event parsing

## Cost Estimate

- Google Calendar API: Free (up to 1M requests/day)
- Cloudflare Workers: Free tier (100k requests/day)
- Cloudflare Workers AI: ~$0.01 per 1000 requests
- **Total: ~$3-5/month for typical salon**
