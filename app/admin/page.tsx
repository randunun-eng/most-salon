'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Edit2, Trash2, Check, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';

// Minimal types for Admin
interface Booking {
    id: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    service_id: string;
    stylist_id: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled';
}

interface Stylist {
    id: string;
    name: string;
}

interface Service {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    // Dashboard Data
    const [date, setDate] = useState<Date>(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit State
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Login Logic
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple hardcoded PIN for MVP
        if (pin === '1234') {
            setIsAuthenticated(true);
            fetchData();
        } else {
            setError('Invalid PIN');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bRes, sRes, svRes] = await Promise.all([
                fetch('/api/bookings'),
                fetch('/api/stylists'),
                fetch('/api/services')
            ]);

            const bData = await bRes.json();
            const sData = await sRes.json();
            const svData = await svRes.json();

            setBookings(bData);
            setStylists(sData);
            setServices(svData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter bookings for selected date
    const selectedDateBookings = bookings.filter(b => {
        const d = new Date(b.start_time);
        return d.toDateString() === date.toDateString() && b.status !== 'cancelled';
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Update Booking
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBooking) return;

        try {
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingBooking)
            });

            if (res.ok) {
                setIsEditOpen(false);
                fetchData(); // Refresh
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Cancel Booking
    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            const res = await fetch(`/api/bookings?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="pt-6">
                        <h1 className="text-2xl font-bold text-center mb-6">Salon Admin</h1>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <Label>Enter PIN</Label>
                                <Input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="Enter 1234"
                                    className="text-center text-lg tracking-widest"
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <Button type="submit" className="w-full">Login</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const formattedDateTimeValue = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        // specific offset for Sri Lanka if needed, but browser local is best usually
        // Using browser's local time:
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* ... sidebar ... */}

            {/* ... main content ... */}

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Booking</DialogTitle>
                    </DialogHeader>
                    {editingBooking && (
                        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Start Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formattedDateTimeValue(editingBooking.start_time)}
                                        onChange={(e) => setEditingBooking({
                                            ...editingBooking,
                                            start_time: new Date(e.target.value).toISOString()
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label>End Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formattedDateTimeValue(editingBooking.end_time)}
                                        onChange={(e) => setEditingBooking({
                                            ...editingBooking,
                                            end_time: new Date(e.target.value).toISOString()
                                        })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Stylist</Label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={editingBooking.stylist_id}
                                    onChange={(e) => setEditingBooking({
                                        ...editingBooking,
                                        stylist_id: e.target.value
                                    })}
                                >
                                    {stylists.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label>Client Name</Label>
                                <Input
                                    value={editingBooking.client_name}
                                    onChange={(e) => setEditingBooking({
                                        ...editingBooking,
                                        client_name: e.target.value
                                    })}
                                />
                            </div>

                            <Button type="submit" className="w-full">Save Changes</Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function DropdownAdd({ bookings }: { bookings: any[] }) {
    return (
        <Button onClick={() => window.open('/', '_blank')}>
            <Plus className="w-4 h-4 mr-2" /> New Booking
        </Button>
    )
}
