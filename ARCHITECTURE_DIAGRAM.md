# System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SALON MOST BOOKING SYSTEM                        │
│                         Production Architecture                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐         ┌──────────────────────┐             │
│  │  Booking Page        │         │  Admin Dashboard     │             │
│  │  /booking            │         │  /admin              │             │
│  ├──────────────────────┤         ├──────────────────────┤             │
│  │ • Service Selection  │         │ • Booking Stats      │             │
│  │ • Stylist Selection  │         │ • Status Filters     │             │
│  │ • Date & Time Picker │         │ • Confirm/Cancel     │             │
│  │ • Client Details     │         │ • Real-time Updates  │             │
│  │ • Confirmation       │         │ • Booking List       │             │
│  └──────────┬───────────┘         └──────────┬───────────┘             │
│             │                                 │                          │
│             └────────────┬────────────────────┘                          │
│                          │                                               │
│                          ▼                                               │
│              ┌───────────────────────┐                                  │
│              │ ProductionBookingFlow │                                  │
│              │   Component           │                                  │
│              ├───────────────────────┤                                  │
│              │ • State Management    │                                  │
│              │ • API Integration     │                                  │
│              │ • Form Validation     │                                  │
│              │ • Animations          │                                  │
│              └───────────┬───────────┘                                  │
│                          │                                               │
└──────────────────────────┼───────────────────────────────────────────────┘
                           │
                           │ HTTP Requests
                           │
┌──────────────────────────┼───────────────────────────────────────────────┐
│                          ▼              API LAYER                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │ GET /stylists   │  │ GET /services   │  │ GET /bookings   │        │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │
│           │                     │                     │                  │
│           └─────────────────────┼─────────────────────┘                  │
│                                 │                                        │
│           ┌─────────────────────┼─────────────────────┐                  │
│           │                     │                     │                  │
│  ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐        │
│  │ GET             │  │ POST            │  │ PATCH           │        │
│  │ /availability   │  │ /bookings       │  │ /bookings       │        │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤        │
│  │ • Check Cache   │  │ • Validate Data │  │ • Update Status │        │
│  │ • Generate Slots│  │ • Create Booking│  │ • Invalidate    │        │
│  │ • Filter Future │  │ • Invalidate    │  │   Cache         │        │
│  │ • Return JSON   │  │   Cache         │  │ • Return JSON   │        │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │
│           │                     │                     │                  │
│           └─────────────────────┼─────────────────────┘                  │
│                                 │                                        │
└─────────────────────────────────┼─────────────────────────────────────────┘
                                  │
                                  │ Function Calls
                                  │
┌─────────────────────────────────┼─────────────────────────────────────────┐
│                                 ▼          BUSINESS LOGIC LAYER          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────┐         │
│  │                    Slot Engine (slot-engine.ts)            │         │
│  ├───────────────────────────────────────────────────────────┤         │
│  │                                                             │         │
│  │  generateSlotsForStylist()                                 │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ 1. Check working days                            │      │         │
│  │  │ 2. Parse working hours (start/end)               │      │         │
│  │  │ 3. Generate 15-min intervals                     │      │         │
│  │  │ 4. Check break times                             │      │         │
│  │  │ 5. Check existing bookings                       │      │         │
│  │  │ 6. Detect overlaps                               │      │         │
│  │  │ 7. Return available slots                        │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  │                                                             │         │
│  │  generateSlotsAllStylists() [Auto-Assign Mode]            │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ 1. Loop through all active stylists              │      │         │
│  │  │ 2. Generate slots for each                       │      │         │
│  │  │ 3. Combine all slots                             │      │         │
│  │  │ 4. Sort by time                                  │      │         │
│  │  │ 5. Return with stylist info                      │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  │                                                             │         │
│  │  isOverlapping()                                           │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ Check if two time ranges overlap                 │      │         │
│  │  │ Formula: startA < endB && endA > startB          │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  │                                                             │         │
│  └─────────────────────────┬───────────────────────────────────┘         │
│                            │                                             │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             │ Data Operations
                             │
┌────────────────────────────┼─────────────────────────────────────────────┐
│                            ▼              DATA LAYER                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────┐         │
│  │              Database Operations (database.ts)             │         │
│  ├───────────────────────────────────────────────────────────┤         │
│  │                                                             │         │
│  │  CRUD Operations:                                          │         │
│  │  • getStylists()         • getServices()                   │         │
│  │  • getStylist(id)        • getService(id)                  │         │
│  │  • getBookings()         • getBooking(id)                  │         │
│  │  • getBookingsForStylist(id, date)                         │         │
│  │  • createBooking(data)                                     │         │
│  │  • updateBookingStatus(id, status)                         │         │
│  │                                                             │         │
│  │  Cache Operations:                                         │         │
│  │  • getCachedAvailability(stylistId, date)                  │         │
│  │  • setCachedAvailability(stylistId, date, slots)           │         │
│  │                                                             │         │
│  └─────────────────────────┬───────────────────────────────────┘         │
│                            │                                             │
│                            ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │                  Storage Layer                           │           │
│  ├─────────────────────────────────────────────────────────┤           │
│  │                                                           │           │
│  │  CURRENT: In-Memory Arrays                               │           │
│  │  ┌─────────────────────────────────────────┐            │           │
│  │  │ • stylists: Stylist[]                    │            │           │
│  │  │ • services: Service[]                    │            │           │
│  │  │ • bookings: Booking[]                    │            │           │
│  │  │ • availabilityCache: Map<string, Cache>  │            │           │
│  │  └─────────────────────────────────────────┘            │           │
│  │                                                           │           │
│  │  PRODUCTION: PostgreSQL                                  │           │
│  │  ┌─────────────────────────────────────────┐            │           │
│  │  │ Tables:                                  │            │           │
│  │  │ • stylists                               │            │           │
│  │  │ • services                               │            │           │
│  │  │ • bookings                               │            │           │
│  │  │ • availability_cache                     │            │           │
│  │  │                                          │            │           │
│  │  │ Indexes:                                 │            │           │
│  │  │ • idx_booking_stylist_date               │            │           │
│  │  │ • idx_booking_status                     │            │           │
│  │  └─────────────────────────────────────────┘            │           │
│  │                                                           │           │
│  └───────────────────────────────────────────────────────────┘           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          CACHING STRATEGY                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Request → Check Cache → [Cache Hit?]                                   │
│                              │                                           │
│                    ┌─────────┴─────────┐                                │
│                    │                   │                                 │
│                   YES                 NO                                 │
│                    │                   │                                 │
│                    ▼                   ▼                                 │
│            Return Cached      Generate Fresh Slots                      │
│               Slots                    │                                 │
│                                        ▼                                 │
│                                 Store in Cache                           │
│                                 (5 min TTL)                              │
│                                        │                                 │
│                                        ▼                                 │
│                                Return Fresh Slots                        │
│                                                                          │
│  Booking Created/Cancelled → Invalidate Cache (stylist_id + date)       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW EXAMPLE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Action: "Book haircut with Sarah on Feb 15 at 10:00 AM"          │
│                                                                          │
│  1. Frontend: Select "Haircut & Styling" (60 min)                       │
│     └─> GET /api/services                                               │
│                                                                          │
│  2. Frontend: Select "Sarah Johnson"                                    │
│     └─> GET /api/stylists                                               │
│                                                                          │
│  3. Frontend: Select date "2026-02-15"                                  │
│     └─> GET /api/availability?date=2026-02-15&serviceId=service-1       │
│         &stylistId=stylist-1                                            │
│         │                                                                │
│         ├─> Check cache for stylist-1 + 2026-02-15                      │
│         │   └─> Cache MISS                                              │
│         │                                                                │
│         ├─> Get Sarah's schedule:                                       │
│         │   • Working days: [1,2,3,4,5,6] (Mon-Sat)                     │
│         │   • Hours: 09:00 - 18:00                                      │
│         │   • Break: 13:00 - 14:00                                      │
│         │                                                                │
│         ├─> Get existing bookings for Sarah on Feb 15                   │
│         │   └─> Found: 1 booking (10:00-11:00)                          │
│         │                                                                │
│         ├─> Generate slots (15-min intervals):                          │
│         │   09:00 ✓  09:15 ✓  09:30 ✓  09:45 ✓                          │
│         │   10:00 ✗ (booked)  10:15 ✗  10:30 ✗  10:45 ✗                 │
│         │   11:00 ✓  11:15 ✓  11:30 ✓  11:45 ✓                          │
│         │   12:00 ✓  12:15 ✓  12:30 ✓  12:45 ✓                          │
│         │   13:00 ✗ (break)   13:15 ✗  13:30 ✗  13:45 ✗                 │
│         │   14:00 ✓  14:15 ✓  14:30 ✓  ... 17:00 ✓                      │
│         │                                                                │
│         ├─> Store in cache (TTL: 5 min)                                 │
│         │                                                                │
│         └─> Return available slots to frontend                          │
│                                                                          │
│  4. Frontend: User selects "11:00 AM"                                   │
│                                                                          │
│  5. Frontend: User enters details                                       │
│     • Name: "John Doe"                                                  │
│     • Email: "john@example.com"                                         │
│     • Phone: "+94771234567"                                             │
│                                                                          │
│  6. Frontend: Submit booking                                            │
│     └─> POST /api/bookings                                              │
│         {                                                                │
│           client_name: "John Doe",                                      │
│           client_email: "john@example.com",                             │
│           client_phone: "+94771234567",                                 │
│           service_id: "service-1",                                      │
│           stylist_id: "stylist-1",                                      │
│           start_time: "2026-02-15T11:00:00.000Z"                        │
│         }                                                                │
│         │                                                                │
│         ├─> Validate data                                               │
│         ├─> Calculate end_time (11:00 + 60 min = 12:00)                 │
│         ├─> Create booking record                                       │
│         ├─> Invalidate cache (stylist-1 + 2026-02-15)                   │
│         └─> Return booking confirmation                                 │
│                                                                          │
│  7. Frontend: Show confirmation screen                                  │
│     ✓ Booking confirmed!                                                │
│     Service: Haircut & Styling                                          │
│     Stylist: Sarah Johnson                                              │
│     Date: Feb 15, 2026                                                  │
│     Time: 11:00 AM                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGY STACK                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Frontend:                                                               │
│  • Next.js 15 (App Router)                                              │
│  • TypeScript                                                            │
│  • Tailwind CSS                                                          │
│  • Framer Motion                                                         │
│  • Radix UI                                                              │
│                                                                          │
│  Backend:                                                                │
│  • Next.js API Routes                                                    │
│  • TypeScript                                                            │
│  • In-Memory DB (dev) → PostgreSQL (prod)                               │
│                                                                          │
│  Deployment:                                                             │
│  • Cloudflare Pages / Vercel                                            │
│  • Neon PostgreSQL (serverless)                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```
