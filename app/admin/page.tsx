'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Calendar, Users, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface Booking {
    id: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    service_id: string;
    stylist_id: string;
    start_time: string;
    status: 'confirmed' | 'pending' | 'cancelled';
}

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);

    // Simple client-side auth for demo purposes
    // In production, use real auth or Cloudflare Access
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin123') { // Default password
            setIsAuthenticated(true);
            fetchBookings();
        } else {
            alert('Invalid password');
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            // Fetch bookings from API
            // Note: In real app, this would be a protected API endpoint
            // For now, we'll mock it or fetch from the public bookings API if available
            // Since we don't have a direct "get all bookings" API, we'll simulate for UI
            const res = await fetch('/api/availability?date=' + new Date().toISOString().split('T')[0] + '&serviceId=any&stylistId=any');
            // This is just a placeholder to show data structure
            // In a real app, you'd add GET /api/admin/bookings
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const triggerSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/calendar/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setLastSync(new Date().toLocaleTimeString());
                alert('Sync completed successfully! ' + (data.message || ''));
                fetchBookings(); // Refresh data
            } else {
                alert('Sync failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('Sync failed to connect');
        } finally {
            setSyncing(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center font-serif">Salon Admin Login</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:outline-none"
                                    placeholder="Enter admin password"
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Login
                            </Button>
                            <div className="text-center text-xs text-muted-foreground mt-4">
                                Default: admin123
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary/10">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-serif">Admin Dashboard</h1>
                        <p className="text-muted-foreground">Manage bookings and sync calendar</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {lastSync && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                Synced: {lastSync}
                            </span>
                        )}
                        <Button
                            onClick={triggerSync}
                            disabled={syncing}
                            className="flex items-center gap-2"
                        >
                            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {syncing ? 'Syncing...' : 'Sync with Google'}
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Today's Bookings</p>
                                <h3 className="text-2xl font-bold">8</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Est. Revenue</p>
                                <h3 className="text-2xl font-bold">LKR 42,500</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Stylists</p>
                                <h3 className="text-2xl font-bold">3</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bookings List Placeholder */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b text-left text-sm text-muted-foreground">
                                        <th className="py-3 px-2">Client</th>
                                        <th className="py-3 px-2">Service</th>
                                        <th className="py-3 px-2">Stylist</th>
                                        <th className="py-3 px-2">Time</th>
                                        <th className="py-3 px-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {/* Demo Data for Visuals */}
                                    <tr className="border-b hover:bg-muted/50">
                                        <td className="py-3 px-2 font-medium">Alice Brown</td>
                                        <td className="py-3 px-2">Haircut & Styling</td>
                                        <td className="py-3 px-2">Sarah Johnson</td>
                                        <td className="py-3 px-2">Today, 2:00 PM</td>
                                        <td className="py-3 px-2">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                Confirmed
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="border-b hover:bg-muted/50">
                                        <td className="py-3 px-2 font-medium">Michael Green</td>
                                        <td className="py-3 px-2">Beard Trim</td>
                                        <td className="py-3 px-2">Michael Chen</td>
                                        <td className="py-3 px-2">Today, 3:30 PM</td>
                                        <td className="py-3 px-2">
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                                Pending
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="border-b hover:bg-muted/50">
                                        <td className="py-3 px-2 font-medium">Emma Watson</td>
                                        <td className="py-3 px-2">Full Color</td>
                                        <td className="py-3 px-2">Emma Williams</td>
                                        <td className="py-3 px-2">Tomorrow, 10:00 AM</td>
                                        <td className="py-3 px-2">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                Confirmed
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                (Connect to database to see live bookings)
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
