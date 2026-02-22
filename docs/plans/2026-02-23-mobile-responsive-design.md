# Mobile Responsive Design — 2026-02-23

## Scope
Make both the public site and admin dashboard fully mobile-friendly.

---

## Admin Dashboard

### 1. Bottom Tab Bar (mobile only)
- Hide the left sidebar on mobile (`hidden md:flex`)
- Add a fixed `<nav>` at the bottom of the screen (`fixed bottom-0 md:hidden`) with 5 tabs:
  - Dashboard (CalendarIcon)
  - Inbox (MessageSquare)
  - Services (Scissors)
  - Team (User)
  - Settings (Settings)
- Active tab highlighted with white background/text
- File: `app/admin/page.tsx`

### 2. Calendar on Mobile
- On desktop: stays in the sidebar bottom
- On mobile: render calendar inside the dashboard content area, above the bookings list
- Use `hidden md:block` on sidebar calendar and `block md:hidden` on inline calendar
- File: `app/admin/page.tsx`

### 3. Bookings — Card View on Mobile
- Add `hidden md:table` to the `<table>` element
- Add a `block md:hidden` card list below it that renders each booking as a card:
  - Status badge + time on one line
  - Client name + phone
  - Service + stylist
  - Action buttons (WhatsApp, Edit, Cancel) always visible (not hover-only)
- File: `app/admin/page.tsx`

### 4. AdminChat — Mobile Two-Panel Toggle
- Add `mobileView: 'list' | 'chat'` state
- On mobile: show only `mobileView === 'list'` panel or `mobileView === 'chat'` panel
- When a chat is selected on mobile: auto-switch to `'chat'`
- Add a ← back button in the chat header on mobile that returns to `'list'`
- On desktop: both panels always visible (existing `md:grid-cols-3` layout unchanged)
- File: `components/admin/AdminChat.tsx`

### 5. Business Hours — Stack on Mobile
- The hours row: change `flex items-center justify-between` to `flex flex-col sm:flex-row`
- Time inputs group: `flex flex-wrap gap-2`
- File: `app/admin/page.tsx`

### 6. Admin Header on Mobile
- Show "Most Salon" title + Logout button in a top bar on mobile
- Hidden on desktop (sidebar handles it)
- File: `app/admin/page.tsx`

---

## Public Site

### 7. Hero Badge — Wrap Gracefully
- The badge strip: change to `flex-wrap` so items wrap on very small screens
- File: `components/Hero.tsx`

### 8. Services / HighlightSection / About / LookBook
- Audit grid classes and fix any missing responsive breakpoints
- Files: `components/Services.tsx`, `components/HighlightSection.tsx`, `components/About.tsx`, `components/LookBook.tsx`

### 9. Booking Page
- Create booking form fields go `grid-cols-1` on mobile (already mostly fine, verify)
- File: `app/booking/page.tsx`

---

## Implementation Order
1. Admin bottom tab bar + mobile header
2. Admin calendar on mobile
3. Bookings card view
4. AdminChat mobile toggle
5. Business hours stack
6. Public site tweaks (Hero, Services, etc.)
7. Build + deploy
