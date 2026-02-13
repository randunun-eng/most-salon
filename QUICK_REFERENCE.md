# Quick Reference Guide - Salon MOST Booking System

## 🚀 Quick Start

### First Time Setup
```bash
# 1. Free up disk space (IMPORTANT!)
Remove-Item -Recurse -Force .next
npm cache clean --force

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
http://localhost:3000/booking
```

---

## 📍 Important URLs

| Page | URL | Description |
|------|-----|-------------|
| **Booking** | `/booking` | Public booking interface |
| **Admin** | `/admin` | Booking management dashboard |
| **Home** | `/` | Main website |

---

## 🔌 API Quick Reference

### Get Stylists
```bash
GET /api/stylists
```

### Get Services
```bash
GET /api/services
```

### Get Availability
```bash
GET /api/availability?date=2026-02-15&serviceId=service-1&stylistId=stylist-1
# or for auto-assign:
GET /api/availability?date=2026-02-15&serviceId=service-1&stylistId=any
```

### Create Booking
```bash
POST /api/bookings
Content-Type: application/json

{
  "client_name": "John Doe",
  "client_email": "john@example.com",
  "client_phone": "+94771234567",
  "service_id": "service-1",
  "stylist_id": "stylist-1",
  "start_time": "2026-02-15T10:00:00.000Z"
}
```

### Update Booking Status
```bash
PATCH /api/bookings
Content-Type: application/json

{
  "id": "booking-123",
  "status": "confirmed"  // or "cancelled"
}
```

---

## 🛠️ Common Tasks

### Add a New Service

**File:** `lib/database.ts`

```typescript
// Add to services array:
{
  id: 'service-9',
  name: 'Deep Conditioning Treatment',
  duration_minutes: 45,
  price: 4000,
  created_at: new Date()
}
```

### Add a New Stylist

**File:** `lib/database.ts`

```typescript
// Add to stylists array:
{
  id: 'stylist-4',
  name: 'Alex Rivera',
  email: 'alex@salonmost.com',
  phone: '+94771234570',
  bio: 'Color Specialist',
  working_days: [1, 2, 3, 4, 5], // Mon-Fri
  start_time: '10:00',
  end_time: '19:00',
  break_start: '14:00',
  break_end: '15:00',
  is_active: true,
  created_at: new Date()
}
```

### Change Slot Interval

**File:** `lib/slot-engine.ts`

```typescript
// Line ~41
const interval = 30; // Change from 15 to 30 minutes
```

### Modify Cache Duration

**File:** `lib/database.ts`

```typescript
// Line ~189
const cacheAge = Date.now() - cached.last_updated.getTime();
if (cacheAge > 10 * 60 * 1000) { // Change from 5 to 10 minutes
  availabilityCache.delete(cacheKey);
  return null;
}
```

---

## 🎨 Customization

### Change Primary Color

**File:** `tailwind.config.js`

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#your-color',
        foreground: '#ffffff'
      }
    }
  }
}
```

### Modify Booking Steps

**File:** `components/ProductionBookingFlow.tsx`

Edit the step labels around line 100:
```typescript
{s === 1 && 'Service'}
{s === 2 && 'Stylist'}
{s === 3 && 'Date & Time'}
{s === 4 && 'Details'}
{s === 5 && 'Confirm'}
```

---

## 🐛 Troubleshooting

### Problem: "ENOSPC: no space left on device"

**Solution:**
```bash
# Clean build artifacts
Remove-Item -Recurse -Force .next

# Clean npm cache
npm cache clean --force

# If still failing, clean node_modules
Remove-Item -Recurse -Force node_modules
npm install
```

### Problem: API returns empty slots

**Check:**
1. Date is in the future
2. Stylist works on that day of week
3. Service exists
4. Time is within working hours

**Debug:**
```javascript
// Add console.log in lib/slot-engine.ts
console.log('Working days:', stylist.working_days);
console.log('Day of week:', date.getDay());
console.log('Generated slots:', slots.length);
```

### Problem: Booking not appearing in admin

**Check:**
1. Booking was created successfully (check API response)
2. Refresh admin dashboard
3. Check filter (might be on "pending" but booking is "confirmed")

### Problem: TypeScript errors

**Solution:**
```bash
# Restart TypeScript server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild
npm run build
```

---

## 📊 Testing Checklist

### Before Deployment
- [ ] All services display correctly
- [ ] All stylists display correctly
- [ ] Slots generate for each stylist
- [ ] Auto-assign mode works
- [ ] Booking creation works
- [ ] Admin dashboard shows bookings
- [ ] Status updates work
- [ ] Mobile responsive
- [ ] No console errors

### Test Booking Flow
1. Go to `/booking`
2. Select a service
3. Select a stylist (or auto-assign)
4. Pick tomorrow's date
5. Select a time slot
6. Enter test details
7. Confirm booking
8. Check admin dashboard

---

## 📝 File Locations

### Core Files
```
lib/
├── db-types.ts          # TypeScript interfaces
├── database.ts          # Database operations
└── slot-engine.ts       # Slot generation logic

app/api/
├── stylists/route.ts    # Stylist API
├── services/route.ts    # Services API
├── availability/route.ts # Availability API
└── bookings/route.ts    # Bookings API

components/
└── ProductionBookingFlow.tsx # Main booking component

app/
├── booking/page.tsx     # Booking page
└── admin/page.tsx       # Admin dashboard
```

### Documentation
```
BOOKING_SYSTEM_README.md    # Complete system docs
DEPLOYMENT_GUIDE.md         # Deployment instructions
BUILD_SUMMARY.md            # Build overview
ARCHITECTURE_DIAGRAM.md     # Visual architecture
QUICK_REFERENCE.md          # This file
```

---

## 🔄 Common Workflows

### Deploy to Cloudflare
```bash
# 1. Build
npm run pages:build

# 2. Deploy
npx wrangler pages deploy

# 3. Visit your site
https://your-project.pages.dev
```

### Deploy to Vercel
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Visit your site
https://your-project.vercel.app
```

### Update Demo Data
```bash
# Edit lib/database.ts
# Modify stylists, services, or bookings arrays
# Save file
# Restart dev server (Ctrl+C, then npm run dev)
```

### Clear All Bookings
```bash
# Edit lib/database.ts
# Set bookings = []
# Save file
# Restart dev server
```

---

## 💡 Pro Tips

### 1. Testing with Different Dates
```javascript
// In browser console:
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
console.log(tomorrow.toISOString().split('T')[0]);
// Use this date in your tests
```

### 2. Quick API Testing
```javascript
// In browser console on your site:
fetch('/api/stylists').then(r => r.json()).then(console.log);
fetch('/api/services').then(r => r.json()).then(console.log);
```

### 3. Check Cache Status
```javascript
// API response includes cache status:
{
  "slots": [...],
  "cached": true,  // ← Cache was used
  "stylist": {...}
}
```

### 4. Force Cache Refresh
Create any booking for that stylist/date, cache will auto-invalidate.

---

## 🎯 Performance Tips

### 1. Reduce Slot Interval
If too many slots are generated:
```typescript
// lib/slot-engine.ts
const interval = 30; // Instead of 15
```

### 2. Limit Date Range
```typescript
// components/ProductionBookingFlow.tsx
// Change from 14 days to 7 days:
for (let i = 1; i <= 7; i++) {
```

### 3. Optimize Cache
```typescript
// lib/database.ts
// Increase cache duration from 5 to 15 minutes:
if (cacheAge > 15 * 60 * 1000) {
```

---

## 🔐 Security Notes

### Current Implementation
- ✅ Input validation on API
- ✅ Type checking with TypeScript
- ⚠️ No authentication (add for production)
- ⚠️ No rate limiting (add for production)

### Add Authentication (Future)
```bash
npm install next-auth
```

### Add Rate Limiting (Future)
```bash
npm install @upstash/ratelimit @upstash/redis
```

---

## 📱 Mobile Testing

### Test on Real Device
1. Find your local IP: `ipconfig`
2. Start dev server: `npm run dev`
3. On mobile, visit: `http://YOUR_IP:3000/booking`

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## 🆘 Getting Help

### Documentation
1. `BOOKING_SYSTEM_README.md` - Complete system overview
2. `DEPLOYMENT_GUIDE.md` - Deployment steps
3. `BUILD_SUMMARY.md` - Feature checklist
4. `ARCHITECTURE_DIAGRAM.md` - Visual architecture

### Debug Mode
Add to any API route:
```typescript
console.log('Debug:', { variable1, variable2 });
```

Check terminal for output.

---

## ✅ Pre-Deployment Checklist

- [ ] Disk space freed
- [ ] Build completes successfully
- [ ] All tests pass
- [ ] Demo data updated
- [ ] Environment variables set
- [ ] Database migrated (if using PostgreSQL)
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Analytics added
- [ ] Error tracking setup

---

## 🎉 Quick Wins

### Immediate Improvements
1. Add your logo to navbar
2. Update color scheme
3. Add real stylist photos
4. Customize service descriptions
5. Add salon address/contact info

### Easy Integrations
1. Google Analytics (1 line of code)
2. Facebook Pixel (1 line of code)
3. WhatsApp chat widget
4. Social media links

---

**Last Updated:** February 13, 2026  
**Version:** 1.0.0

For detailed information, see the complete documentation files.
