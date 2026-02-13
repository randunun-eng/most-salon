# 🔄 Google Calendar Sync - Complete Setup Guide

## Overview

Your Salon MOST booking system now has **two-way Google Calendar sync** with AI-powered event analysis!

### Features:
- ✅ Sync every 10 minutes automatically
- ✅ Cloudflare Workers AI analyzes calendar events
- ✅ Salon owner can manage bookings from Google Calendar
- ✅ Only 7-day booking window
- ✅ Two-way sync (Calendar ↔ Database)

---

## 📋 Setup Steps

### Step 1: Google Calendar API Setup

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com
   - Create new project: "Salon MOST Booking"

2. **Enable Google Calendar API:**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `https://most-salon.pages.dev/api/auth/google`
   - Click "Create"
   - **Save the Client ID and Client Secret**

4. **Get Refresh Token:**
   ```bash
   # Use OAuth Playground or run this locally
   # Visit: https://developers.google.com/oauthplayground
   # 1. Select "Google Calendar API v3"
   # 2. Authorize APIs
   # 3. Exchange authorization code for tokens
   # 4. Copy the refresh_token
   ```

---

### Step 2: Cloudflare Setup

1. **Get Cloudflare Account ID:**
   - Go to: https://dash.cloudflare.com
   - Click on any site
   - Scroll down to "API" section on right sidebar
   - Copy "Account ID"

2. **Create Cloudflare AI Token:**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use template: "Edit Cloudflare Workers"
   - Add permission: "Account" → "Workers AI" → "Edit"
   - Create token and **save it**

---

### Step 3: Set Environment Variables

#### For Cloudflare Pages (Website):

Go to: https://dash.cloudflare.com → Pages → most-salon → Settings → Environment variables

Add these variables:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_CALENDAR_ID=primary
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_AI_TOKEN=your_cloudflare_ai_token
```

#### For Cloudflare Worker (Cron Job):

```bash
cd "C:\Users\Lenovo\Documents\Antigravity\salon most"

# Set secrets (one by one)
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put GOOGLE_CALENDAR_ID
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_AI_TOKEN
npx wrangler secret put CRON_SECRET
```

---

### Step 4: Deploy Cloudflare Worker

```bash
cd "C:\Users\Lenovo\Documents\Antigravity\salon most"

# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
npx wrangler login

# Deploy the worker
npx wrangler deploy workers/calendar-sync.ts --config wrangler-worker.toml
```

---

### Step 5: Test the Sync

#### Manual Sync Test:

```bash
# Test the sync API endpoint
curl -X POST https://most-salon.pages.dev/api/calendar/sync
```

Or visit in browser:
```
https://most-salon.pages.dev/api/calendar/sync
```

#### Check Sync Status:

1. Create an event in Google Calendar:
   ```
   Title: Haircut - John Doe
   Description: Phone: +94771234567
   Time: Tomorrow at 2:00 PM
   ```

2. Wait 10 minutes (or trigger manual sync)

3. Check admin dashboard:
   ```
   https://most-salon.pages.dev/admin
   ```

4. Booking should appear automatically!

---

## 🤖 How AI Analysis Works

The system uses **Cloudflare Workers AI (Llama 3)** to analyze calendar events:

### Example 1: Simple Event
```
Title: "Haircut - Sarah Smith"
Description: "Phone: +94771234567"

AI extracts:
- Service: Haircut
- Client: Sarah Smith
- Phone: +94771234567
```

### Example 2: Detailed Event
```
Title: "Hair Coloring with Emma - Alice Brown"
Description: "Email: alice@example.com, Phone: +94779336857"

AI extracts:
- Service: Hair Coloring
- Stylist: Emma Williams
- Client: Alice Brown
- Email: alice@example.com
- Phone: +94779336857
```

### Example 3: Natural Language
```
Title: "Bridal makeup for wedding"
Description: "Client: Maria, Contact: +94771234567"

AI extracts:
- Service: Bridal Package
- Client: Maria
- Phone: +94771234567
```

---

## 📅 How Salon Owner Uses It

### Creating Bookings in Google Calendar:

1. **Open Google Calendar on phone**
2. **Create new event:**
   - Title: `[Service] - [Client Name]`
   - Description: `Phone: [number]`
   - Time: Select date and time
3. **Save**
4. **Within 10 minutes:** Booking appears on website!

### Modifying Bookings:

1. **Change time:** Edit event time → Booking updates automatically
2. **Cancel:** Delete event or mark as "Cancelled" → Booking cancelled
3. **Reschedule:** Change event time → Booking time updates

### Viewing Bookings:

- All website bookings appear in Google Calendar
- Can view on phone, tablet, computer
- Get Google Calendar notifications

---

## 🔄 Sync Behavior

### Every 10 Minutes:

1. **Fetch events from Google Calendar** (next 7 days only)
2. **Analyze new events with AI**
3. **Create bookings in database**
4. **Update modified events**
5. **Cancel deleted events**
6. **Sync database bookings to calendar**

### Conflict Resolution:

- **Last modified wins**
- If event changed in calendar → Database updates
- If booking changed in database → Calendar updates
- AI helps resolve ambiguous cases

---

## 🎯 7-Day Booking Window

- **Website:** Only shows next 7 days
- **Google Calendar:** Only syncs next 7 days
- **Older bookings:** Automatically archived
- **Future bookings:** Not synced until within 7 days

---

## 💰 Cost Estimate

| Service | Usage | Cost |
|---------|-------|------|
| Google Calendar API | Free tier | $0 |
| Cloudflare Workers | 144 runs/day | $0 (free tier) |
| Cloudflare Workers AI | ~150 requests/day | ~$0.15/day |
| **Total** | | **~$4.50/month** |

---

## 🐛 Troubleshooting

### Sync not working?

1. **Check environment variables** in Cloudflare dashboard
2. **Check worker logs:**
   ```bash
   npx wrangler tail salon-calendar-sync
   ```
3. **Manual sync test:**
   ```
   https://most-salon.pages.dev/api/calendar/sync
   ```

### AI not parsing events?

- Use format: `Service - Client Name`
- Add phone in description: `Phone: +94XXXXXXXXX`
- Check AI confidence score in logs

### Events not appearing?

- Check date is within next 7 days
- Verify calendar ID is correct
- Check Google Calendar API quota

---

## 📱 Mobile Management

Salon owner can manage everything from phone:

1. **Google Calendar app** (Android/iOS)
2. **Create/edit/delete events**
3. **Get notifications**
4. **View schedule**
5. **All changes sync automatically!**

---

## 🎉 You're Done!

Your booking system now has:
- ✅ Two-way Google Calendar sync
- ✅ AI-powered event analysis
- ✅ 10-minute automatic sync
- ✅ 7-day booking window
- ✅ Mobile management via Google Calendar

**Test it now:**
1. Create an event in Google Calendar
2. Wait 10 minutes
3. Check the admin dashboard!

---

**Questions? Check the logs or trigger manual sync to debug!**
