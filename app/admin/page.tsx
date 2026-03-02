'use client';

import {
    Calendar as CalendarIcon,
    Clock,
    DollarSign,
    LogOut,
    Menu,
    Plus,
    Settings,
    User,
    Users,
    X,
    MessageSquare,
    Scissors,
    Loader2,
    Edit2,
    Trash2,
    Palmtree,
    RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Stylist, Booking, Service, BusinessDay } from '@/lib/db-types';
import AdminChat from '@/components/admin/AdminChat';
import AdminServices from '@/components/admin/AdminServices';

type AdminView = 'dashboard' | 'inbox' | 'services' | 'team' | 'settings';

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'no-show': 'bg-red-500/10 text-red-500 border-red-500/20',
    cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
};

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
    const [view, setView] = useState<AdminView>('dashboard');

    // Settings State
    const [bizHours, setBizHours] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});
    const [isAddingStylist, setIsAddingStylist] = useState(false);
    const [newStylist, setNewStylist] = useState({ name: '', phone: '', calendar_id: '', google_refresh_token: '', google_client_id: '', google_client_secret: '' });
    const [isAddingHoliday, setIsAddingHoliday] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ date: '', reason: '', stylist_id: '' });
    const [integrationByStylist, setIntegrationByStylist] = useState<Record<string, any>>({});

    // Edit State
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newBooking, setNewBooking] = useState({
        client_name: '',
        client_email: '',
        client_phone: '',
        service_id: '',
        stylist_id: '',
        start_time: '',
        notes: ''
    });
    const [createDate, setCreateDate] = useState('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // Login Logic
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === '1234') {
            setIsAuthenticated(true);
            fetchData();
            fetchSettings();
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

            const stylistList = Array.isArray(sData) ? sData : [];
            setBookings(Array.isArray(bData) ? bData : []);
            setStylists(stylistList);
            setServices(Array.isArray(svData) ? svData : []);
            fetchStylistIntegrations(stylistList);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStylistIntegrations = async (stylistList: Stylist[]) => {
        try {
            const pairs = await Promise.all(
                stylistList.map(async (stylist) => {
                    const res = await fetch(`/api/stylists/integration?id=${stylist.id}`);
                    if (!res.ok) return [stylist.id, null] as const;
                    return [stylist.id, await res.json()] as const;
                })
            );
            setIntegrationByStylist(Object.fromEntries(pairs));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSettings = async () => {
        try {
            const [hRes, holyRes] = await Promise.all([
                fetch('/api/settings/hours'),
                fetch('/api/settings/holidays')
            ]);
            if (hRes.ok) setBizHours(await hRes.json());
            if (holyRes.ok) setHolidays(await holyRes.json());

            const gRes = await fetch('/api/settings/global');
            if (gRes.ok) setGlobalSettings(await gRes.json());
        } catch (err) {
            console.error(err);
        }
    };

    // Auto-refresh bookings every 30 seconds when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Fetch available slots when service + stylist + date are all selected
    useEffect(() => {
        if (!newBooking.service_id || !newBooking.stylist_id || !createDate) {
            setAvailableSlots([]);
            return;
        }
        setSlotsLoading(true);
        fetch(`/api/availability?date=${createDate}&serviceId=${newBooking.service_id}&stylistId=${newBooking.stylist_id}`)
            .then(r => r.json())
            .then(data => setAvailableSlots(Array.isArray(data.slots) ? data.slots : []))
            .catch(() => setAvailableSlots([]))
            .finally(() => setSlotsLoading(false));
    }, [newBooking.service_id, newBooking.stylist_id, createDate]);

    // Reset slot state when create dialog closes
    useEffect(() => {
        if (!isCreateOpen) {
            setCreateDate('');
            setAvailableSlots([]);
        }
    }, [isCreateOpen]);

    const updateGlobalSetting = async (key: string, value: string) => {
        try {
            setGlobalSettings(prev => ({ ...prev, [key]: value }));
            await fetch('/api/settings/global', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
            fetchSettings();
        } catch (err) {
            console.error(err);
        }
    };

    const addStylist = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/stylists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newStylist.name, phone: newStylist.phone })
            });
            if (res.ok) {
                const created = await res.json();
                if (newStylist.calendar_id || newStylist.google_refresh_token || newStylist.google_client_id || newStylist.google_client_secret) {
                    await fetch('/api/stylists/integration', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            stylist_id: created.id,
                            calendar_id: newStylist.calendar_id || 'primary',
                            google_refresh_token: newStylist.google_refresh_token,
                            google_client_id: newStylist.google_client_id,
                            google_client_secret: newStylist.google_client_secret
                        })
                    });
                }
                setIsAddingStylist(false);
                setNewStylist({ name: '', phone: '', calendar_id: '', google_refresh_token: '', google_client_id: '', google_client_secret: '' });
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteStylistAt = async (id: string) => {
        if (!confirm('Are you sure? This will deactivate the stylist.')) return;
        try {
            await fetch(`/api/stylists?id=${id}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const updateStylistCalendar = async (stylistId: string, updates: Record<string, string>) => {
        try {
            const current = integrationByStylist[stylistId] || {};
            const payload = {
                stylist_id: stylistId,
                calendar_id: updates.calendar_id ?? current.calendar_id ?? 'primary',
                google_refresh_token: updates.google_refresh_token ?? current.google_refresh_token ?? '',
                google_client_id: updates.google_client_id ?? current.google_client_id ?? '',
                google_client_secret: updates.google_client_secret ?? current.google_client_secret ?? ''
            };
            await fetch('/api/stylists/integration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            setIntegrationByStylist(prev => ({ ...prev, [stylistId]: { ...current, ...payload } }));
        } catch (err) {
            console.error(err);
        }
    };

    const updateHour = async (day: number, data: any) => {
        try {
            await fetch('/api/settings/hours', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day, ...data })
            });
            fetchSettings();
        } catch (err) {
            console.error(err);
        }
    };

    const saveHoliday = async () => {
        try {
            await fetch('/api/settings/holidays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newHoliday)
            });
            setNewHoliday({ date: '', reason: '', stylist_id: '' });
            setIsAddingHoliday(false);
            fetchSettings();
        } catch (err) {
            console.error(err);
        }
    };

    const removeHoliday = async (id: string) => {
        try {
            await fetch(`/api/settings/holidays?id=${id}`, { method: 'DELETE' });
            fetchSettings();
        } catch (err) {
            console.error(err);
        }
    };

    // Filter bookings for selected date (including completed/no-show)
    const selectedDateBookings = bookings.filter(b => {
        if (!b || !b.start_time) return false;
        const d = new Date(b.start_time);
        return d.toDateString() === date.toDateString();
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Create Booking
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBooking)
            });

            if (res.ok) {
                setIsCreateOpen(false);
                setNewBooking({
                    client_name: '', client_email: '', client_phone: '',
                    service_id: '', stylist_id: '', start_time: '', notes: ''
                });
                setCreateDate('');
                setAvailableSlots([]);
                fetchData();
            } else {
                alert('Failed to create booking');
            }
        } catch (err) {
            console.error(err);
        }
    };

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
                fetchData();
                return;
            }

            if (res.status === 409) {
                const data = await res.json();
                const conflictStart = data?.conflict?.start_time ? new Date(data.conflict.start_time).toLocaleString() : 'Unknown';
                const proceed = confirm(`Conflict detected at ${conflictStart}. This may overlap another booking. Override and save anyway?`);
                if (proceed) {
                    const forceRes = await fetch('/api/bookings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...editingBooking, force_override: true })
                    });
                    if (forceRes.ok) {
                        setIsEditOpen(false);
                        fetchData();
                    }
                }
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

    const formatTime = (iso: string | Date) => {
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

    const formattedDateTimeValue = (isoString: string | Date) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            const offset = date.getTimezoneOffset() * 60000;
            const localDate = new Date(date.getTime() - offset);
            return localDate.toISOString().slice(0, 16);
        } catch (e) {
            return '';
        }
    };

    const NAV_ITEMS = [
        { id: 'dashboard', label: 'Dashboard', icon: Loader2 },
        { id: 'settings', label: 'Settings', icon: Settings }
    ];

    const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="min-h-screen !bg-black !text-white">
            {/* Mobile Top Header */}
            <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800">
                <h1 className="text-lg font-bold text-white">Most Salon</h1>
                <Button variant="ghost" size="icon" onClick={() => setIsAuthenticated(false)} className="text-gray-400">
                    <LogOut className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex">
            {/* Sidebar — desktop only */}
            <div className="hidden md:flex md:flex-col md:w-64 !bg-neutral-900 border-r !border-neutral-800 h-screen sticky top-0">
                <div className="p-6 border-b !border-neutral-800 flex items-center justify-between">
                    <h1 className="text-xl font-bold !text-white">Most Salon</h1>
                    <Button variant="ghost" size="icon" onClick={() => setIsAuthenticated(false)} className="text-gray-400">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setView('dashboard')}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            view === 'dashboard' ? "!bg-white !text-black" : "text-gray-400 hover:!bg-white/5 hover:!text-white"
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setView('inbox')}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            view === 'inbox' ? "!bg-white !text-black" : "text-gray-400 hover:!bg-white/5 hover:!text-white"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Inbox
                    </button>
                    <button
                        onClick={() => setView('services')}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            view === 'services' ? "!bg-white !text-black" : "text-gray-400 hover:!bg-white/5 hover:!text-white"
                        )}
                    >
                        <Scissors className="w-4 h-4" />
                        Services
                    </button>
                    <button
                        onClick={() => setView('team')}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            view === 'team' ? "!bg-white !text-black" : "text-gray-400 hover:!bg-white/5 hover:!text-white"
                        )}
                    >
                        <User className="w-4 h-4" />
                        Team
                    </button>
                    <button
                        onClick={() => setView('settings')}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            view === 'settings' ? "!bg-white !text-black" : "text-gray-400 hover:!bg-white/5 hover:!text-white"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>
                </nav>

                {view === 'dashboard' && (
                    <div className="p-4 border-t !border-neutral-800">
                        <div className="calendar-wrapper custom-calendar invert-0">
                            <Calendar
                                onChange={(d) => setDate(d as Date)}
                                value={date}
                                className="rounded-lg border !border-neutral-700 !bg-neutral-800 !text-white w-full text-xs"
                            />
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                .custom-calendar .react-calendar { font-family: inherit; border: none; background: transparent !important; width: 100% !important; }
                                .custom-calendar .react-calendar__navigation { margin-bottom: 0.5rem; height: 30px; }
                                .custom-calendar .react-calendar__navigation button { color: white !important; font-size: 12px; }
                                .custom-calendar .react-calendar__month-view__weekdays { font-size: 10px; }
                                .custom-calendar .react-calendar__tile { padding: 0.5rem 0.2rem !important; font-size: 11px; }
                                .custom-calendar .react-calendar__tile--now { background: #eab308 !important; color: black !important; }
                                .custom-calendar .react-calendar__tile--active { background: white !important; color: black !important; }
                            `}} />
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto md:h-screen p-4 md:p-8 pb-24 md:pb-8">
                {view === 'dashboard' && (
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-6 md:mb-10">
                            <div>
                                <h2 className="text-xl md:text-3xl font-bold !text-white mb-1 md:mb-2">{date.toDateString() === new Date().toDateString() ? 'Today' : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
                                <p className="text-gray-400 text-sm">Viewing {selectedDateBookings.length} appointments</p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => fetchData()} variant="outline" size="icon" className="border-white/20 text-white hover:bg-white/10" title="Refresh bookings">
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button onClick={() => setIsCreateOpen(true)} className="bg-white text-black hover:bg-gray-200">
                                    <Plus className="w-4 h-4 mr-2" /> New Booking
                                </Button>
                            </div>
                        </div>

                        {/* Mobile Calendar */}
                        <div className="block md:hidden mb-6">
                            <div className="calendar-wrapper custom-calendar">
                                <Calendar
                                    onChange={(d) => setDate(d as Date)}
                                    value={date}
                                    className="rounded-lg border !border-neutral-700 !bg-neutral-800 !text-white w-full text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-10">
                            <StatsCard title="Confirmed" value={selectedDateBookings.filter(b => b.status === 'confirmed').length} />
                            <StatsCard title="Completed" value={selectedDateBookings.filter(b => b.status === 'completed').length} />
                            <StatsCard title="Total" value={selectedDateBookings.length} />
                            <StatsCard title="Pending" value={selectedDateBookings.filter(b => b.status === 'pending').length} />
                        </div>

                        <div className="bg-neutral-900 border !border-neutral-800 rounded-2xl overflow-hidden">
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs uppercase bg-neutral-800 text-gray-400 border-b !border-neutral-700">
                                        <tr>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Time</th>
                                            <th className="px-6 py-4">Client</th>
                                            <th className="px-6 py-4">Service / Stylist</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y !divide-neutral-800">
                                        {selectedDateBookings.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                    No appointments for this date.
                                                </td>
                                            </tr>
                                        ) : selectedDateBookings.map(b => (
                                            <tr key={b.id} className="hover:!bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className={cn("px-2 py-1 rounded text-[10px] font-bold tracking-wider border uppercase", statusColors[b.status])}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium !text-white whitespace-nowrap">
                                                    {formatTime(b.start_time)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium !text-white">{b.client_name}</div>
                                                    <div className="text-xs text-gray-500">{b.client_phone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-300">{services.find(s => s.id === b.service_id)?.name}</div>
                                                    <div className="text-xs text-gray-500">with {stylists.find(s => s.id === b.stylist_id)?.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-400 hover:!bg-green-400/10"
                                                            title="WhatsApp Message"
                                                            onClick={() => {
                                                                const time = formatTime(b.start_time);
                                                                const service = services.find(s => s.id === b.service_id)?.name;
                                                                const message = `Hello ${b.client_name}, this is Most Salon. Just confirming your appointment for ${service} at ${time} on ${date.toDateString()}. See you then!`;

                                                                // Clean and format phone number for Sri Lanka
                                                                let phone = b.client_phone.replace(/[^0-9]/g, '');
                                                                if (phone.startsWith('0') && phone.length === 10) {
                                                                    phone = '94' + phone.substring(1);
                                                                }

                                                                window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
                                                            }}
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.017 3.518 1.554 5.362 1.555h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-400 hover:!bg-blue-400/10"
                                                            onClick={() => { setEditingBooking(b); setIsEditOpen(true); }}
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </Button>
                                                        {b.status !== 'cancelled' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-400 hover:!bg-red-400/10"
                                                                onClick={() => handleCancel(b.id)}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-neutral-800">
                                {selectedDateBookings.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-gray-500">No appointments for this date.</div>
                                ) : selectedDateBookings.map(b => (
                                    <div key={b.id} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className={cn("px-2 py-1 rounded text-[10px] font-bold tracking-wider border uppercase", statusColors[b.status])}>
                                                {b.status}
                                            </span>
                                            <span className="font-medium text-white text-sm">{formatTime(b.start_time)}</span>
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{b.client_name}</div>
                                            <div className="text-xs text-gray-500">{b.client_phone}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-300 text-sm">{services.find(s => s.id === b.service_id)?.name}</div>
                                            <div className="text-xs text-gray-500">with {stylists.find(s => s.id === b.stylist_id)?.name}</div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:!bg-green-400/10" title="WhatsApp"
                                                onClick={() => {
                                                    const time = formatTime(b.start_time);
                                                    const service = services.find(s => s.id === b.service_id)?.name;
                                                    const message = `Hello ${b.client_name}, this is Most Salon. Just confirming your appointment for ${service} at ${time} on ${date.toDateString()}. See you then!`;
                                                    let phone = b.client_phone.replace(/[^0-9]/g, '');
                                                    if (phone.startsWith('0') && phone.length === 10) phone = '94' + phone.substring(1);
                                                    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
                                                }}>
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.017 3.518 1.554 5.362 1.555h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:!bg-blue-400/10"
                                                onClick={() => { setEditingBooking(b); setIsEditOpen(true); }}>
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                            {b.status !== 'cancelled' && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:!bg-red-400/10"
                                                    onClick={() => handleCancel(b.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'inbox' && (
                    <AdminChat />
                )}

                {view === 'services' && (
                    <AdminServices />
                )}

                {view === 'team' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Users className="w-6 h-6 text-purple-500" />
                                <h2 className="text-3xl font-bold !text-white">Team Management</h2>
                            </div>
                            <Button onClick={() => setIsAddingStylist(true)} variant="outline" size="sm" className="!border-neutral-700 hover:!bg-white/5">
                                <Plus className="w-4 h-4 mr-2" /> Add Stylist
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {stylists.map(s => (
                                <Card key={s.id} className={cn("!bg-neutral-900 !border-neutral-800", !s.is_active && "opacity-50")}>
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="font-medium !text-white text-lg">{s.name} {!s.is_active && "(Inactive)"}</div>
                                            <div className="text-xs text-gray-500 mt-1">ID: {s.id}</div>
                                            <div className="text-xs text-gray-400 mt-1">WhatsApp: {s.phone || 'Not set'}</div>
                                        </div>

                                        <div className="flex-1 max-w-md">
                                            <Label className="text-[10px] uppercase text-gray-500 mb-1 block">Google Calendar ID</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    defaultValue={s.calendar_id || ''}
                                                    placeholder="email@gmail.com or 'primary'"
                                                    className="h-8 !bg-neutral-800 !border-neutral-700 !text-sm !text-white"
                                                    onBlur={(e) => updateStylistCalendar(s.id, { calendar_id: e.target.value })}
                                                />
                                            </div>
                                            <p className="text-[9px] text-gray-600 mt-1 italic">Leaves field to sync with main salon calendar.</p>
                                            <Label className="text-[10px] uppercase text-gray-500 mb-1 mt-3 block">Google OAuth Client ID</Label>
                                            <Input
                                                defaultValue={integrationByStylist[s.id]?.google_client_id || ''}
                                                placeholder="Google OAuth Client ID"
                                                className="h-8 !bg-neutral-800 !border-neutral-700 !text-sm !text-white"
                                                onBlur={(e) => updateStylistCalendar(s.id, { google_client_id: e.target.value })}
                                            />
                                            <Label className="text-[10px] uppercase text-gray-500 mb-1 mt-3 block">Google OAuth Client Secret</Label>
                                            <Input
                                                type="password"
                                                defaultValue={integrationByStylist[s.id]?.google_client_secret || ''}
                                                placeholder="Google OAuth Client Secret"
                                                className="h-8 !bg-neutral-800 !border-neutral-700 !text-sm !text-white"
                                                onBlur={(e) => updateStylistCalendar(s.id, { google_client_secret: e.target.value })}
                                            />
                                            <Label className="text-[10px] uppercase text-gray-500 mb-1 mt-3 block">Google Refresh Token</Label>
                                            <Input
                                                type="password"
                                                defaultValue={integrationByStylist[s.id]?.google_refresh_token || ''}
                                                placeholder="Google Refresh Token"
                                                className="h-8 !bg-neutral-800 !border-neutral-700 !text-sm !text-white"
                                                onBlur={(e) => updateStylistCalendar(s.id, { google_refresh_token: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {s.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-400 hover:!bg-red-400/10"
                                                    onClick={() => deleteStylistAt(s.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'settings' && (
                    <div className="max-w-4xl mx-auto space-y-12">
                        <div>
                            <h2 className="text-3xl font-bold !text-white mb-2">Salon Settings</h2>
                            <p className="text-gray-400">Manage business hours and holidays</p>
                        </div>

                        {/* Business Hours */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-yellow-500" />
                                <h3 className="text-xl font-semibold !text-white">Weekly Operating Hours</h3>
                            </div>
                            <Card className="!bg-neutral-900 border !border-neutral-800 overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="divide-y !divide-neutral-800">
                                        {DAYS_OF_WEEK.map((dayName, idx) => {
                                            const hour = bizHours.find(h => h.day === idx) || { open: '09:00', close: '18:00', is_closed: 0 };
                                            return (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 px-4 sm:px-6 gap-2 hover:!bg-white/5 transition-colors">
                                                    <span className="font-medium !text-white w-24 shrink-0">{dayName}</span>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="time"
                                                                disabled={hour.is_closed}
                                                                value={hour.open}
                                                                onChange={(e) => updateHour(idx, { ...hour, open: e.target.value })}
                                                                className="!bg-neutral-800 border-none h-8 w-28 text-white focus:!ring-1 !ring-white/20"
                                                            />
                                                            <span className="text-gray-500 text-xs">to</span>
                                                            <Input
                                                                type="time"
                                                                disabled={hour.is_closed}
                                                                value={hour.close}
                                                                onChange={(e) => updateHour(idx, { ...hour, close: e.target.value })}
                                                                className="!bg-neutral-800 border-none h-8 w-28 text-white focus:!ring-1 !ring-white/20"
                                                            />
                                                        </div>
                                                        <Label className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!hour.is_closed}
                                                                onChange={(e) => updateHour(idx, { ...hour, is_closed: e.target.checked ? 1 : 0 })}
                                                                className="w-4 h-4 rounded border-neutral-700 !bg-neutral-800 checked:!bg-white accent-white"
                                                            />
                                                            <span className="text-sm text-gray-400 group-hover:text-white">Closed</span>
                                                        </Label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* General Settings */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Settings className="w-5 h-5 text-blue-500" />
                                <h3 className="text-xl font-semibold !text-white">General Salon Settings</h3>
                            </div>
                            <Card className="!bg-neutral-900 border !border-neutral-800">
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="!text-gray-300">Salon WhatsApp Number (Notification)</Label>
                                            <Input
                                                value={globalSettings.salon_whatsapp || ''}
                                                onChange={(e) => updateGlobalSetting('salon_whatsapp', e.target.value)}
                                                placeholder="e.g. 94779336857"
                                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                                            />
                                            <p className="text-[10px] text-gray-500 italic">This number receives notifications and is used for client chat links. Use international format without + (e.g. 94779336857).</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="!text-gray-300">Salon Name</Label>
                                            <Input
                                                value={globalSettings.salon_name || ''}
                                                onChange={(e) => updateGlobalSetting('salon_name', e.target.value)}
                                                placeholder="Most Salon"
                                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="!text-gray-300">Salon Address</Label>
                                        <Input
                                            value={globalSettings.salon_address || ''}
                                            onChange={(e) => updateGlobalSetting('salon_address', e.target.value)}
                                            placeholder="Full Address"
                                            className="!bg-neutral-800 !border-neutral-700 !text-white"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Holidays */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Palmtree className="w-5 h-5 text-green-500" />
                                    <h3 className="text-xl font-semibold !text-white">Holidays & Closures</h3>
                                </div>
                                <Button onClick={() => setIsAddingHoliday(true)} variant="outline" size="sm" className="!border-neutral-700 hover:!bg-white/5">
                                    <Plus className="w-3 h-3 mr-2" /> Add Holiday
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {holidays.map(h => (
                                    <Card key={h.id} className="!bg-neutral-900 !border-neutral-800">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="font-medium !text-white">{new Date(h.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                                <div className="text-xs text-gray-400">{h.reason}</div>
                                                {h.stylist_id && (
                                                    <div className="text-[10px] mt-1 text-yellow-500/80 uppercase font-bold">
                                                        For: {stylists.find(s => s.id === h.stylist_id)?.name}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-gray-500 hover:text-red-400 hover:!bg-red-400/10 h-8 w-8"
                                                onClick={() => removeHoliday(h.id)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                                {holidays.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-500 border border-dashed !border-neutral-800 rounded-2xl">
                                        No holidays scheduled.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
            </div>{/* end flex wrapper */}

            {/* Mobile Bottom Tab Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900 border-t border-neutral-800">
                <div className="flex">
                    {([
                        { id: 'dashboard' as AdminView, icon: CalendarIcon, label: 'Schedule' },
                        { id: 'inbox' as AdminView, icon: MessageSquare, label: 'Inbox' },
                        { id: 'services' as AdminView, icon: Scissors, label: 'Services' },
                        { id: 'team' as AdminView, icon: User, label: 'Team' },
                        { id: 'settings' as AdminView, icon: Settings, label: 'Settings' },
                    ]).map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setView(id)}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5",
                                view === id ? "text-white" : "text-gray-500"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[9px] uppercase tracking-wide">{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Add Stylist Modal */}
            <Dialog open={isAddingStylist} onOpenChange={setIsAddingStylist}>
                <DialogContent className="!bg-neutral-900 !border-neutral-800 !text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="!text-white text-xl">Add New Stylist</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addStylist} className="space-y-4 pt-4">
                        <div>
                            <Label className="!text-gray-300">Stylist Name</Label>
                            <Input
                                required
                                value={newStylist.name}
                                onChange={e => setNewStylist({ ...newStylist, name: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                        </div>
                        <div>
                            <Label className="!text-gray-300">WhatsApp Number</Label>
                            <Input
                                placeholder="+9477XXXXXXX"
                                value={newStylist.phone}
                                onChange={e => setNewStylist({ ...newStylist, phone: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                        </div>
                        <div>
                            <Label className="!text-gray-300">Google Calendar ID (Optional)</Label>
                            <Input
                                placeholder="email@gmail.com or 'primary'"
                                value={newStylist.calendar_id}
                                onChange={e => setNewStylist({ ...newStylist, calendar_id: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                        </div>
                        <div>
                            <Label className="!text-gray-300">Google OAuth Client ID (Optional)</Label>
                            <Input
                                placeholder="xxxx.apps.googleusercontent.com"
                                value={newStylist.google_client_id}
                                onChange={e => setNewStylist({ ...newStylist, google_client_id: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                        </div>
                        <div>
                            <Label className="!text-gray-300">Google OAuth Client Secret (Optional)</Label>
                            <Input
                                type="password"
                                placeholder="GOCSPX-..."
                                value={newStylist.google_client_secret}
                                onChange={e => setNewStylist({ ...newStylist, google_client_secret: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                        </div>
                        <div>
                            <Label className="!text-gray-300">Google OAuth Refresh Token (Optional)</Label>
                            <Input
                                placeholder="1//0g...."
                                value={newStylist.google_refresh_token}
                                onChange={e => setNewStylist({ ...newStylist, google_refresh_token: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Save stylist calendar credentials here to avoid future code deployments.</p>
                        </div>
                        <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200">Create Stylist</Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Addition Modal for Holiday */}
            <Dialog open={isAddingHoliday} onOpenChange={setIsAddingHoliday}>
                <DialogContent className="!bg-neutral-900 !border-neutral-800 !text-white">
                    <DialogHeader>
                        <DialogTitle className="!text-white">Add Salon Holiday</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div>
                            <Label className="!text-gray-300">Date</Label>
                            <Input
                                type="date"
                                value={newHoliday.date}
                                onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                        </div>
                        <div>
                            <Label className="!text-gray-300">Reason</Label>
                            <Input
                                placeholder="Public holiday, Staff event, etc."
                                value={newHoliday.reason}
                                onChange={e => setNewHoliday({ ...newHoliday, reason: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                        </div>
                        <div>
                            <Label className="!text-gray-300">Stylist (Optional)</Label>
                            <select
                                className="w-full p-2 border rounded-md !bg-neutral-800 !border-neutral-700 !text-white"
                                value={newHoliday.stylist_id}
                                onChange={(e) => setNewHoliday({ ...newHoliday, stylist_id: e.target.value })}
                            >
                                <option value="">Entire Salon (All Stylists)</option>
                                {stylists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <Button onClick={saveHoliday} className="w-full bg-white text-black hover:bg-gray-100">Save Holiday</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Booking Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="!bg-neutral-900 !border-neutral-800 !text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="!text-white text-xl">Create New Booking</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="!text-gray-300">Client Name</Label>
                                <Input required value={newBooking.client_name} onChange={e => setNewBooking({ ...newBooking, client_name: e.target.value })} className="!bg-neutral-800 !border-neutral-700 !text-white" />
                            </div>
                            <div>
                                <Label className="!text-gray-300">Client Phone</Label>
                                <Input required value={newBooking.client_phone} onChange={e => setNewBooking({ ...newBooking, client_phone: e.target.value })} className="!bg-neutral-800 !border-neutral-700 !text-white" />
                            </div>
                        </div>
                        <div>
                            <Label className="!text-gray-300">Client Email</Label>
                            <Input required type="email" value={newBooking.client_email} onChange={e => setNewBooking({ ...newBooking, client_email: e.target.value })} className="!bg-neutral-800 !border-neutral-700 !text-white" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="!text-gray-300">Service</Label>
                                <select required className="w-full p-2 rounded-md !bg-neutral-800 !border-neutral-700 !text-white border"
                                    value={newBooking.service_id} onChange={e => setNewBooking({ ...newBooking, service_id: e.target.value, start_time: '' })}>
                                    <option value="">Select Service</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m)</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="!text-gray-300">Stylist</Label>
                                <select required className="w-full p-2 rounded-md !bg-neutral-800 !border-neutral-700 !text-white border"
                                    value={newBooking.stylist_id} onChange={e => setNewBooking({ ...newBooking, stylist_id: e.target.value, start_time: '' })}>
                                    <option value="">Select Stylist</option>
                                    {stylists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <Label className="!text-gray-300">Date</Label>
                            <Input required type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={createDate}
                                onChange={e => { setCreateDate(e.target.value); setNewBooking({ ...newBooking, start_time: '' }); }}
                                className="!bg-neutral-800 !border-neutral-700 !text-white" />
                        </div>
                        {createDate && newBooking.service_id && newBooking.stylist_id && (
                            <div>
                                <Label className="!text-gray-300">Available Time Slots</Label>
                                {slotsLoading ? (
                                    <p className="text-gray-400 text-sm py-2 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading slots...</p>
                                ) : availableSlots.length === 0 ? (
                                    <p className="text-yellow-400 text-sm py-2">No available slots for this stylist on this day.</p>
                                ) : (
                                    <select required className="w-full p-2 rounded-md bg-neutral-800 border border-neutral-700 text-white"
                                        value={newBooking.start_time}
                                        onChange={e => setNewBooking({ ...newBooking, start_time: e.target.value })}>
                                        <option value="">Select a time</option>
                                        {availableSlots.map((slot: string) => (
                                            <option key={slot} value={slot}>
                                                {new Date(slot).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Colombo' })}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                        <Button type="submit" disabled={!newBooking.start_time} className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50">Create Booking</Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="!bg-neutral-900 !border-neutral-800 !text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="!text-white text-xl">Edit Booking</DialogTitle>
                    </DialogHeader>
                    {editingBooking && (
                        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="!text-gray-300">Status</Label>
                                    <select
                                        className="w-full p-2 border rounded-md !bg-neutral-800 !border-neutral-700 !text-white"
                                        value={editingBooking.status}
                                        onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value as any })}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="completed">Completed</option>
                                        <option value="no-show">No Show</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="flex items-end" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="!text-gray-300">Start Time</Label>
                                    <Input
                                        type="datetime-local"
                                        className="!bg-neutral-800 !border-neutral-700 !text-white"
                                        value={formattedDateTimeValue(editingBooking.start_time)}
                                        onChange={(e) => {
                                            const newStart = new Date(e.target.value);
                                            const service = services.find(s => s.id === editingBooking.service_id);
                                            const duration = service?.duration_minutes || 60;
                                            const newEnd = new Date(newStart.getTime() + duration * 60000);

                                            setEditingBooking({
                                                ...editingBooking,
                                                start_time: newStart,
                                                end_time: newEnd
                                            });
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label className="!text-gray-300">End Time</Label>
                                    <Input
                                        type="datetime-local"
                                        className="!bg-neutral-800 !border-neutral-700 !text-white"
                                        value={formattedDateTimeValue(editingBooking.end_time)}
                                        onChange={(e) => setEditingBooking({
                                            ...editingBooking,
                                            end_time: new Date(e.target.value)
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="!text-gray-300">Stylist</Label>
                                    <select
                                        className="w-full p-2 border rounded-md !bg-neutral-800 !border-neutral-700 !text-white"
                                        value={editingBooking.stylist_id}
                                        onChange={(e) => setEditingBooking({ ...editingBooking, stylist_id: e.target.value })}
                                    >
                                        {stylists.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="!text-gray-300">Service</Label>
                                    <select
                                        className="w-full p-2 border rounded-md !bg-neutral-800 !border-neutral-700 !text-white"
                                        value={editingBooking.service_id}
                                        onChange={(e) => setEditingBooking({ ...editingBooking, service_id: e.target.value })}
                                    >
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label className="!text-gray-300">Client Name</Label>
                                <Input
                                    value={editingBooking.client_name}
                                    className="!bg-neutral-800 !border-neutral-700 !text-white"
                                    onChange={(e) => setEditingBooking({ ...editingBooking, client_name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="!text-gray-300">Client Email</Label>
                                    <Input
                                        value={editingBooking.client_email}
                                        className="!bg-neutral-800 !border-neutral-700 !text-white"
                                        onChange={(e) => setEditingBooking({ ...editingBooking, client_email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label className="!text-gray-300">Client Phone</Label>
                                    <Input
                                        value={editingBooking.client_phone}
                                        className="!bg-neutral-800 !border-neutral-700 !text-white"
                                        onChange={(e) => setEditingBooking({ ...editingBooking, client_phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200">Save Changes</Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatsCard({ title, value }: { title: string, value: number }) {
    return (
        <Card className="!bg-neutral-900 !border-neutral-800 border">
            <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
                <p className="text-3xl font-bold !text-white mt-2">{value}</p>
            </CardContent>
        </Card>
    );
}
