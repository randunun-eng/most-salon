# SALON MOST -- PRODUCTION BOOKING SYSTEM ARCHITECTURE

------------------------------------------------------------------------

# 1️⃣ FULL PRODUCTION-LEVEL DATABASE SCHEMA (PostgreSQL)

## Stylists Table

``` sql
CREATE TABLE stylists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    bio TEXT,
    photo_url TEXT,
    working_days INTEGER[] NOT NULL, -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

------------------------------------------------------------------------

## Services Table

``` sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

------------------------------------------------------------------------

## Bookings Table

``` sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(150) NOT NULL,
    client_email VARCHAR(150) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    service_id UUID REFERENCES services(id),
    stylist_id UUID REFERENCES stylists(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed', -- pending, confirmed, cancelled
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_booking_stylist_date
ON bookings (stylist_id, start_time);
```

------------------------------------------------------------------------

## Availability Cache Table

``` sql
CREATE TABLE availability_cache (
    stylist_id UUID REFERENCES stylists(id),
    date DATE,
    available_slots JSONB,
    last_updated TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (stylist_id, date)
);
```

------------------------------------------------------------------------

# 2️⃣ SLOT ENGINE -- PRODUCTION LOGIC (Node.js)

## Core Principles

-   15-minute internal grid
-   Continuous duration validation
-   Overlap prevention
-   Daily cache generation
-   Recalculate only when booking created or cancelled

------------------------------------------------------------------------

## Helper: Overlap Check

``` javascript
function isOverlapping(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}
```

------------------------------------------------------------------------

## Generate Available Slots

``` javascript
async function generateSlotsForStylist(stylist, date, serviceDuration, bookings) {
  const slots = [];
  const interval = 15; // minutes

  const dayStart = new Date(`${date}T${stylist.start_time}`);
  const dayEnd = new Date(`${date}T${stylist.end_time}`);

  for (let time = new Date(dayStart); time < dayEnd; time.setMinutes(time.getMinutes() + interval)) {
    
    const slotStart = new Date(time);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

    if (slotEnd > dayEnd) continue;

    const overlaps = bookings.some(booking =>
      isOverlapping(slotStart, slotEnd, booking.start_time, booking.end_time)
    );

    if (!overlaps) {
      slots.push(slotStart);
    }
  }

  return slots;
}
```

------------------------------------------------------------------------

# 3️⃣ DAILY CACHE STRATEGY

## Get Slots With Cache

``` javascript
async function getAvailableSlots(stylistId, date, serviceDuration) {

  const cached = await db.query(
    `SELECT available_slots FROM availability_cache
     WHERE stylist_id=$1 AND date=$2`,
    [stylistId, date]
  );

  if (cached.rowCount > 0) {
    return cached.rows[0].available_slots;
  }

  const stylist = await getStylist(stylistId);
  const bookings = await getBookingsForDate(stylistId, date);

  const slots = await generateSlotsForStylist(
    stylist,
    date,
    serviceDuration,
    bookings
  );

  await db.query(
    `INSERT INTO availability_cache(stylist_id, date, available_slots)
     VALUES($1, $2, $3)`,
    [stylistId, date, JSON.stringify(slots)]
  );

  return slots;
}
```

------------------------------------------------------------------------

# 4️⃣ CACHE INVALIDATION RULE

When new booking is created:

``` javascript
async function createBooking(data) {

  await db.query(
    `INSERT INTO bookings (...) VALUES (...)`
  );

  await db.query(
    `DELETE FROM availability_cache
     WHERE stylist_id=$1 AND date=$2`,
    [data.stylist_id, data.date]
  );
}
```

Cache recalculates automatically next time user requests availability.

------------------------------------------------------------------------

# 5️⃣ NO-STYLIST MODE (AUTO ASSIGN)

``` javascript
async function getAvailableSlotsWithoutStylist(date, serviceDuration) {
  const stylists = await getActiveStylists();
  const result = [];

  for (const stylist of stylists) {
    const slots = await getAvailableSlots(stylist.id, date, serviceDuration);
    if (slots.length > 0) {
      result.push(...slots);
    }
  }

  return [...new Set(result)];
}
```

------------------------------------------------------------------------

# 6️⃣ FRONTEND -- FULLCALENDAR JS (Recommended)

## Installation

``` bash
npm install @fullcalendar/react @fullcalendar/daygrid
```

------------------------------------------------------------------------

## Basic Setup

``` javascript
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'

export default function BookingCalendar({ events }) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin]}
      initialView="dayGridMonth"
      events={events}
      height="auto"
    />
  )
}
```

------------------------------------------------------------------------

## Dynamic Slot Loading

``` javascript
async function fetchSlots(date) {
  const response = await fetch(`/api/slots?date=${date}`);
  return await response.json();
}
```

------------------------------------------------------------------------

## Mobile Responsiveness

-   Use height="auto"
-   Tailwind responsive wrappers
-   Use timeGridWeek for desktop
-   Use dayGridMonth for mobile

------------------------------------------------------------------------

# 7️⃣ PRODUCTION DEPLOYMENT STACK

Frontend: - Next.js 15 - Tailwind CSS - FullCalendar JS

Backend: - Node.js API routes - PostgreSQL - Redis (optional for high
traffic)

Integrations: - WhatsApp API - Google Calendar API - Email confirmation
system

------------------------------------------------------------------------

# FINAL SYSTEM BEHAVIOR

1.  Client selects service → duration loaded.
2.  Client selects stylist or auto mode.
3.  Available slots fetched (from cache).
4.  Booking created.
5.  Cache invalidated.
6.  WhatsApp sent to owner.
7.  Google Calendar event created.
8.  30-min reminder triggered automatically.

------------------------------------------------------------------------

END OF DOCUMENT
