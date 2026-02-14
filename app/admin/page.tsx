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

            if (!bRes.ok || !sRes.ok || !svRes.ok) throw new Error('Failed to fetch data');

            const bData = await bRes.json();
            const sData = await sRes.json();
            const svData = await svRes.json();

            setBookings(Array.isArray(bData) ? bData : []);
            setStylists(Array.isArray(sData) ? sData : []);
            setServices(Array.isArray(svData) ? svData : []);
        } catch (err) {
            console.error(err);
            // setError('Failed to load dashboard data'); // optional: show global error
        } finally {
            setLoading(false);
        }
    };

    // Filter bookings for selected date (Restored handlers)
    const selectedDateBookings = bookings.filter(b => {
        if (!b || !b.start_time) return false;
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
        try {
            const date = new Date(isoString);
            // specific offset for Sri Lanka if needed, but browser local is best usually
            // Using browser's local time:
            const offset = date.getTimezoneOffset() * 60000;
            const localDate = new Date(date.getTime() - offset);
            return localDate.toISOString().slice(0, 16);
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="min-h-screen !bg-black !text-white flex flex-col md:flex-row">
            {/* Sidebar / Date Picker */}
            <div className="md:w-80 !bg-neutral-900 border-r !border-neutral-800 p-6 flex flex-col gap-6 h-screen overflow-y-auto sticky top-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold !text-white">Admin Panel</h1>
                    <Button variant="ghost" size="icon" onClick={() => setIsAuthenticated(false)} className="text-gray-400 hover:text-white hover:bg-white/10">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>

                <div className="calendar-wrapper custom-calendar invert-0">
                    <Calendar
                        onChange={(d) => setDate(d as Date)}
                        value={date}
                        className="rounded-lg border !border-neutral-700 !bg-neutral-900 !text-white w-full"
                    />
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .custom-calendar .react-calendar { font-family: inherit; border: none; background: transparent !important; }
                        .custom-calendar .react-calendar__navigation button { color: white !important; font-weight: bold; }
                        .custom-calendar .react-calendar__navigation button:enabled:hover,
                        .custom-calendar .react-calendar__navigation button:enabled:focus { background-color: #262626 !important; }
                        .custom-calendar .react-calendar__month-view__weekdays__weekday { color: #a3a3a3 !important; text-decoration: none; }
                        .custom-calendar .react-calendar__month-view__days__day { color: white !important; }
                        .custom-calendar .react-calendar__tile:enabled:hover,
                        .custom-calendar .react-calendar__tile:enabled:focus { background-color: #262626 !important; color: white !important; }
                        .custom-calendar .react-calendar__tile--now { background: #eab308 !important; color: black !important; }
                        .custom-calendar .react-calendar__tile--active { background: white !important; color: black !important; }
                    `}} />
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-semibold !text-white">Today's Bookings ({selectedDateBookings.length})</h2>
                    {loading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </div>
                    ) : selectedDateBookings.length === 0 ? (
                        <p className="text-gray-500 text-sm">No bookings for this date.</p>
                    ) : (
                        <div className="space-y-3">
                            {selectedDateBookings.map(booking => (
                                <Card key={booking.id} className="shadow-sm !bg-neutral-800 !border-neutral-700 !text-white">
                                    <CardContent className="p-4 text-sm">
                                        <p className="font-medium !text-white">{booking.client_name}</p>
                                        <p className="text-gray-400">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
                                        <p className="text-gray-400">
                                            {services.find(s => s.id === booking.service_id)?.name} with {stylists.find(s => s.id === booking.stylist_id)?.name}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="!border-neutral-600 !text-neutral-300 hover:!bg-neutral-700 hover:!text-white"
                                                onClick={() => {
                                                    setEditingBooking(booking);
                                                    setIsEditOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-4 h-4 mr-1" /> Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleCancel(booking.id)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" /> Cancel
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-8 !bg-black">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold !text-white">Dashboard v3</h2>
                    <DropdownAdd bookings={bookings} />
                </div>

                {/* Placeholder for other dashboard content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Example Card */}
                    <Card className="!bg-neutral-900 !border-neutral-800">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold !text-white">Total Bookings</h3>
                            <p className="text-3xl font-bold !text-white">{bookings.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="!bg-neutral-900 !border-neutral-800">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold !text-white">Confirmed Bookings</h3>
                            <p className="text-3xl font-bold !text-white">{bookings.filter(b => b.status === 'confirmed').length}</p>
                        </CardContent>
                    </Card>
                    <Card className="!bg-neutral-900 !border-neutral-800">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold !text-white">Stylists</h3>
                            <p className="text-3xl font-bold !text-white">{stylists.length}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="!bg-neutral-900 !border-neutral-800 !text-white">
                    <DialogHeader>
                        <DialogTitle className="!text-white">Edit Booking</DialogTitle>
                    </DialogHeader>
                    {editingBooking && (
                        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="!text-white">Start Time</Label>
                                    <Input
                                        type="datetime-local"
                                        className="!bg-neutral-800 !border-neutral-700 !text-white"
                                        value={formattedDateTimeValue(editingBooking.start_time)}
                                        onChange={(e) => setEditingBooking({
                                            ...editingBooking,
                                            start_time: new Date(e.target.value).toISOString()
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label className="!text-white">End Time</Label>
                                    <Input
                                        type="datetime-local"
                                        className="!bg-neutral-800 !border-neutral-700 !text-white"
                                        value={formattedDateTimeValue(editingBooking.end_time)}
                                        onChange={(e) => setEditingBooking({
                                            ...editingBooking,
                                            end_time: new Date(e.target.value).toISOString()
                                        })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="!text-white">Stylist</Label>
                                <select
                                    className="w-full p-2 border rounded-md !bg-neutral-800 !border-neutral-700 !text-white"
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
                                <Label className="!text-white">Client Name</Label>
                                <Input
                                    value={editingBooking.client_name}
                                    className="!bg-neutral-800 !border-neutral-700 !text-white"
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
