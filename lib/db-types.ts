// Database Types for Production Booking System

export interface Stylist {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    bio?: string;
    photo_url?: string;
    working_days: number[]; // Array of day indices (0-6)
    start_time: string; // HH:MM format
    end_time: string;
    break_start?: string;
    break_end?: string;
    is_active: boolean;
    calendar_id?: string;
    created_at: Date;
}

export interface Chat {
    id: string;
    client_id: string;
    client_name?: string;
    client_phone?: string;
    ai_status: number; // 1 = On, 0 = Off
    last_message_at: string;
    created_at: string;
    updated_at: string;
    booking_state?: string | null;
}

export interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant' | 'admin';
    content: string;
    created_at: string;
}

export interface Service {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    category?: string; // Hair, Nails, Makeup, Facials, Massage
    created_at: Date;
}

export interface Booking {
    id: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    service_id: string;
    stylist_id: string;
    start_time: Date;
    end_time: Date;
    google_event_id?: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
    created_at: Date;
}

export interface StylistIntegration {
    id: string;
    stylist_id: string;
    google_access_token: string;
    google_refresh_token: string;
    calendar_id: string;
    google_client_id?: string;
    google_client_secret?: string;
    updated_at: Date;
}

export interface BusinessDay {
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
}

export interface Holiday {
    id: string;
    date: string;
    reason: string;
    stylist_id?: string;
}

export interface AvailabilityCache {
    stylist_id: string;
    date: string; // YYYY-MM-DD
    available_slots: Date[];
    last_updated: Date;
}

export interface TimeSlot {
    start: Date;
    end: Date;
    stylist_id: string;
    stylist_name: string;
}

// Cloudflare D1 Types
export interface D1Database {
    prepare: (query: string) => D1PreparedStatement;
    dump: () => Promise<ArrayBuffer>;
    batch: <T = unknown>(statements: D1PreparedStatement[]) => Promise<D1Result<T>[]>;
    exec: (query: string) => Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
    bind: (...values: unknown[]) => D1PreparedStatement;
    first: <T = unknown>(colName?: string) => Promise<T | null>;
    run: <T = unknown>() => Promise<D1Result<T>>;
    all: <T = unknown>() => Promise<D1Result<T>>;
    raw: <T = unknown>() => Promise<T[]>;
}

export interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta: any;
    error?: string;
}

export interface D1ExecResult {
    count: number;
    duration: number;
}
