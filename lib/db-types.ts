// Database Types for Production Booking System

export interface Stylist {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    bio?: string;
    photo_url?: string;
    working_days: number[]; // 0=Sunday, 6=Saturday
    start_time: string; // HH:MM format
    end_time: string;
    break_start?: string;
    break_end?: string;
    is_active: boolean;
    created_at: Date;
}

export interface Service {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
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
    status: 'pending' | 'confirmed' | 'cancelled';
    created_at: Date;
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
