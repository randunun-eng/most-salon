# Stylist Calendar Setup Guide

This guide explains how to link a Google Calendar to a Stylist in the Admin Dashboard. There are two ways to do this.

## Option 1: Secondary Calendars (Recommended)
This method is best if the Salon Owner manages all schedules directly.

1.  **Open Google Calendar**
    - Log in to the main Google Account used for the Salon (the one running the backend).

2.  **Create a New Calendar**
    - On the left sidebar, click the `+` next to **Other calendars**.
    - Select **Create new calendar**.
    - Name it after the stylist (e.g., "Sarah's Bookings").
    - Click **Create calendar**.

3.  **Get the Calendar ID**
    - Find the new calendar in the sidebar (under "My calendars").
    - Click the three dots `⋮` > **Settings and sharing**.
    - Scroll down to the **Integrate calendar** section.
    - Copy the **Calendar ID**.
        - Format: `c_188...481@group.calendar.google.com`

4.  **Link in Admin Dashboard**
    - Go to **Settings** > **Stylists & Calendars**.
    - Paste the ID into the **Google Calendar ID** field for that stylist.
    - It saves automatically.

---

## Option 2: Personal Calendars (Stylist's Own Account)
This method is for stylists who want bookings to appear on their personal Gmail calendar.

1.  **Stylist Actions**
    - The stylist must log in to their personal Google Calendar.
    - Go to **Settings and sharing** for their main calendar.
    - Scroll to **Share with specific people**.
    - Click **Add people**.
    - Enter the **Salon's Main Email Address** (the one running the backend).
    - **CRITICAL**: Set permissions to **"Make changes to events"**.
        - *If this permission is not granted, the system cannot create bookings.*

2.  **Get the Calendar ID**
    - In most cases, the Calendar ID is just the stylist's email address (e.g., `sashinimm@gmail.com`).

3.  **Link in Admin Dashboard**
    - Paste their email address into the **Google Calendar ID** field in the Admin Dashboard.

---

## Troubleshooting

### "Permission Denied" Error
- **Cause**: The system tries to write to a calendar it doesn't have access to.
- **Fix**: Ensure the personal calendar is shared with the main Salon account with **"Make changes"** permission.

### Calendar ID Format
- **Correct**: `c_abc123...@group.calendar.google.com` OR `user@gmail.com`
- **Incorrect**: `html code`, `71fa09...` (unless it's a specific resource ID, but usually it's an email-like string).

### Public Access
- **Do NOT make calendars public.** The system uses a secure backend connection (Service Account or OAuth token) to access calendars. Public access is a privacy risk.
