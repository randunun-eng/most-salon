'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Mail, Phone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    created_at: string;
}

interface Service {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
}

interface Stylist {
    id: string;
    name: string;
}

export default function AdminDashboard() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bookingsRes, servicesRes, stylistsRes] = await Promise.all([
                fetch('/api/bookings'),
                fetch('/api/services'),
                fetch('/api/stylists')
            ]);

            const bookingsData = await bookingsRes.json();
            const servicesData = await servicesRes.json();
            const stylistsData = await stylistsRes.json();

            setBookings(bookingsData);
            setServices(servicesData);
            setStylists(stylistsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
        try {
            const res = await fetch('/api/bookings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: bookingId, status })
            });

            if (res.ok) {
                fetchData(); // Refresh data
            }
        } catch (error) {
            console.error('Error updating booking:', error);
        }
    };

    const getServiceName = (serviceId: string) => {
        return services.find(s => s.id === serviceId)?.name || 'Unknown Service';
    };

    const getStylistName = (stylistId: string) => {
        return stylists.find(s => s.id === stylistId)?.name || 'Unknown Stylist';
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
    };

    const filteredBookings = bookings.filter(b =>
        filter === 'all' ? true : b.status === filter
    ).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const stats = {
        total: bookings.length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        pending: bookings.filter(b => b.status === 'pending').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-32 pb-20 container mx-auto px-4 max-w-7xl">
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-serif mb-2">Booking Dashboard</h1>
                    <p className="text-muted-foreground">Manage all salon appointments</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="text-3xl font-bold mb-1">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">Total Bookings</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="text-3xl font-bold mb-1 text-green-600">{stats.confirmed}</div>
                            <div className="text-sm text-muted-foreground">Confirmed</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="text-3xl font-bold mb-1 text-yellow-600">{stats.pending}</div>
                            <div className="text-sm text-muted-foreground">Pending</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="text-3xl font-bold mb-1 text-red-600">{stats.cancelled}</div>
                            <div className="text-sm text-muted-foreground">Cancelled</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {(['all', 'confirmed', 'pending', 'cancelled'] as const).map((status) => (
                        <Button
                            key={status}
                            variant={filter === status ? 'default' : 'outline'}
                            onClick={() => setFilter(status)}
                            className="capitalize"
                        >
                            {status}
                        </Button>
                    ))}
                </div>

                {/* Bookings List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <Card className="border-border/50">
                        <CardContent className="p-12 text-center text-muted-foreground">
                            No bookings found
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredBookings.map((booking) => {
                            const { date, time } = formatDateTime(booking.start_time);
                            return (
                                <Card key={booking.id} className="border-border/50 hover:border-primary/50 transition-colors">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-semibold mb-1">{booking.client_name}</h3>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="w-4 h-4" />
                                                                {booking.client_email}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-4 h-4" />
                                                                {booking.client_phone}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-medium",
                                                        booking.status === 'confirmed' && "bg-green-500/20 text-green-700",
                                                        booking.status === 'pending' && "bg-yellow-500/20 text-yellow-700",
                                                        booking.status === 'cancelled' && "bg-red-500/20 text-red-700"
                                                    )}>
                                                        {booking.status}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                                    <span className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-primary" />
                                                        <span className="text-muted-foreground">Service:</span>
                                                        <span className="font-medium">{getServiceName(booking.service_id)}</span>
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-primary" />
                                                        <span className="text-muted-foreground">Stylist:</span>
                                                        <span className="font-medium">{getStylistName(booking.stylist_id)}</span>
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-primary" />
                                                        <span className="font-medium">{date}</span>
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-primary" />
                                                        <span className="font-medium">{time}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {booking.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                                        className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Confirm
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                                        className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Cancel
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
