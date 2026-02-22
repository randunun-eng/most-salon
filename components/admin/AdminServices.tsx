
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Scissors } from 'lucide-react';
import { D1Database, Service } from '@/lib/db-types';

export default function AdminServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Partial<Service>>({});
    const [isLoading, setIsLoading] = useState(false);

    const fetchServices = async () => {
        const res = await fetch('/api/admin/services');
        if (res.ok) setServices(await res.json());
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const action = editingService.id ? 'update' : 'create';
            await fetch('/api/admin/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, service: editingService })
            });
            setIsDialogOpen(false);
            setEditingService({});
            fetchServices();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this service?')) return;
        await fetch('/api/admin/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', service: { id } })
        });
        fetchServices();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold !text-white">Services & Prices</h2>
                    <p className="text-gray-400">Manage your menu. AI uses this data to answer clients.</p>
                </div>
                <Button onClick={() => { setEditingService({}); setIsDialogOpen(true); }} className="bg-white text-black hover:bg-gray-200">
                    <Plus className="w-4 h-4 mr-2" /> Add Service
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(service => (
                    <Card key={service.id} className="!bg-neutral-900 border !border-neutral-800 hover:!bg-neutral-800 transition-colors group">
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <CardTitle className="text-lg font-bold !text-white">{service.name}</CardTitle>
                            <Scissors className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <div className="text-2xl font-bold text-yellow-500">
                                        {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(service.price)}
                                    </div>
                                    <div className="text-sm text-gray-400">{service.duration_minutes} mins • {service.category || 'Hair'}</div>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="ghost" className="h-8 w-8 text-blue-400 hover:bg-blue-400/10"
                                    onClick={() => { setEditingService(service); setIsDialogOpen(true); }}>
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-400/10"
                                    onClick={() => handleDelete(service.id)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="!bg-neutral-900 !border-neutral-800 !text-white">
                    <DialogHeader>
                        <DialogTitle>{editingService.id ? 'Edit Service' : 'New Service'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 pt-4">
                        <div>
                            <Label className="!text-gray-300">Service Name</Label>
                            <Input
                                required
                                value={editingService.name || ''}
                                onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                                className="!bg-neutral-800 !border-neutral-700 !text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="!text-gray-300">Price (LKR)</Label>
                                <Input
                                    required
                                    type="number"
                                    value={editingService.price || ''}
                                    onChange={e => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                                    className="!bg-neutral-800 !border-neutral-700 !text-white"
                                />
                            </div>
                            <div>
                                <Label className="!text-gray-300">Duration (Min)</Label>
                                <Input
                                    required
                                    type="number"
                                    value={editingService.duration_minutes || ''}
                                    onChange={e => setEditingService({ ...editingService, duration_minutes: parseInt(e.target.value) })}
                                    className="!bg-neutral-800 !border-neutral-700 !text-white"
                                />
                            </div>
                            <div>
                                <Label className="!text-gray-300">Category</Label>
                                <select /* using native select for simplicity in modal given z-index issues */
                                    required
                                    value={editingService.category || 'Hair'}
                                    onChange={e => setEditingService({ ...editingService, category: e.target.value })}
                                    className="flex h-10 w-full rounded-md border !border-neutral-700 !bg-neutral-800 px-3 py-2 text-sm !text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="Hair">Hair</option>
                                    <option value="Nails">Nails</option>
                                    <option value="Makeup">Makeup</option>
                                    <option value="Facials">Facials</option>
                                    <option value="Massage">Massage</option>
                                </select>
                            </div>
                        </div>
                        <Button type="submit" disabled={isLoading} className="w-full bg-white text-black hover:bg-gray-200">
                            {isLoading ? 'Saving...' : 'Save Service'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
