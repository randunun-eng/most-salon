'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, User, Mail, Phone, Check, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stylist {
    id: string;
    name: string;
    bio?: string;
}

interface Service {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
}

interface TimeSlot {
    start: string;
    end?: string;
    stylist_id?: string;
    stylist_name?: string;
}

export default function GoogleCalendarBooking() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form data
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [bookingConfirmed, setBookingConfirmed] = useState(false);
    const [whatsappLink, setWhatsappLink] = useState<string>('');

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [weekDates, setWeekDates] = useState<Date[]>([]);

    useEffect(() => {
        fetchStylists();
        fetchServices();
        generateWeekDates();
    }, []);

    useEffect(() => {
        generateWeekDates();
    }, [currentMonth]);

    useEffect(() => {
        if (selectedService && selectedDate) {
            fetchAvailability();
        }
    }, [selectedService, selectedStylist, selectedDate]);

    const generateWeekDates = () => {
        const today = new Date();
        const dates: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date);
        }
        setWeekDates(dates);
        setSelectedDate(today);
    };

    const fetchStylists = async () => {
        try {
            const res = await fetch('/api/stylists');
            const data = await res.json();
            setStylists(data);
        } catch (error) {
            console.error('Error fetching stylists:', error);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/services');
            const data = await res.json();
            setServices(data);
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const fetchAvailability = async () => {
        if (!selectedService || !selectedDate) return;

        setLoading(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const stylistParam = selectedStylist ? selectedStylist.id : 'any';
            const url = `/api/availability?date=${dateStr}&serviceId=${selectedService.id}&stylistId=${stylistParam}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.slots) {
                const formattedSlots = Array.isArray(data.slots[0]) || typeof data.slots[0] === 'string'
                    ? data.slots.map((s: string) => ({ start: s }))
                    : data.slots;
                setAvailableSlots(formattedSlots);
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async () => {
        if (!selectedService || !selectedSlot || !clientName || !clientEmail || !clientPhone) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_name: clientName,
                    client_email: clientEmail,
                    client_phone: clientPhone,
                    service_id: selectedService.id,
                    stylist_id: selectedSlot.stylist_id || selectedStylist?.id || 'stylist-1',
                    start_time: selectedSlot.start
                })
            });

            if (res.ok) {
                const booking = await res.json();
                setBookingConfirmed(true);
                setStep(4);
                sendWhatsAppNotification(booking);
            } else {
                alert('Booking failed. Please try again.');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Booking failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const sendWhatsAppNotification = async (booking: any) => {
        try {
            const bookingDetails = {
                clientName: clientName,
                clientPhone: clientPhone,
                serviceName: selectedService?.name,
                stylistName: selectedSlot?.stylist_name || selectedStylist?.name || 'First Available',
                date: selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                time: formatTime(selectedSlot!.start),
                price: selectedService?.price.toLocaleString(),
                bookingId: booking.id
            };

            const response = await fetch('/api/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: clientPhone,
                    message: 'Booking confirmation',
                    bookingDetails: bookingDetails
                })
            });

            if (response.ok) {
                const data = await response.json();
                setWhatsappLink(data.waLink);
            }
        } catch (error) {
            console.error('Error sending WhatsApp notification:', error);
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date: Date) => {
        return selectedDate && date.toDateString() === selectedDate.toDateString();
    };

    // Generate time slots for the day (9 AM to 6 PM)
    const generateDayTimeSlots = () => {
        const slots = [];
        for (let hour = 9; hour <= 18; hour++) {
            slots.push(`${hour}:00`);
        }
        return slots;
    };

    const isSlotAvailable = (timeStr: string) => {
        if (!selectedDate) return false;
        const [hour, minute] = timeStr.split(':');
        const slotDate = new Date(selectedDate);
        slotDate.setHours(parseInt(hour), parseInt(minute || '0'), 0, 0);
        const slotISO = slotDate.toISOString();

        return availableSlots.some(slot => {
            const slotTime = new Date(slot.start);
            return slotTime.getHours() === parseInt(hour) &&
                slotTime.getMinutes() === parseInt(minute || '0');
        });
    };

    const getSlotInfo = (timeStr: string) => {
        if (!selectedDate) return null;
        const [hour, minute] = timeStr.split(':');
        const slotDate = new Date(selectedDate);
        slotDate.setHours(parseInt(hour), parseInt(minute || '0'), 0, 0);

        return availableSlots.find(slot => {
            const slotTime = new Date(slot.start);
            return slotTime.getHours() === parseInt(hour) &&
                slotTime.getMinutes() === parseInt(minute || '0');
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            {/* Step 1: Select Service */}
            {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <h2 className="text-3xl font-serif text-center mb-8">Select Your Service</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {services.map((service) => (
                            <button
                                key={service.id}
                                onClick={() => {
                                    setSelectedService(service);
                                    setStep(2);
                                }}
                                className="text-left p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                            >
                                <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                                <div className="flex gap-4 text-sm text-muted-foreground">
                                    <span>{service.duration_minutes} min</span>
                                    <span className="font-medium text-primary">LKR {service.price.toLocaleString()}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Step 2: Google Calendar Style Date & Time Selection */}
            {step === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-3xl font-serif">Pick Date & Time</h2>
                            <p className="text-muted-foreground">
                                {selectedService?.name} • {selectedService?.duration_minutes} min • LKR {selectedService?.price.toLocaleString()}
                            </p>
                        </div>
                        <Button variant="ghost" onClick={() => setStep(1)}>
                            ← Change Service
                        </Button>
                    </div>

                    {/* Stylist Selection */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        <button
                            onClick={() => setSelectedStylist(null)}
                            className={cn(
                                "px-4 py-2 rounded-full border-2 whitespace-nowrap transition-all",
                                !selectedStylist ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                            )}
                        >
                            Any Stylist
                        </button>
                        {stylists.map((stylist) => (
                            <button
                                key={stylist.id}
                                onClick={() => setSelectedStylist(stylist)}
                                className={cn(
                                    "px-4 py-2 rounded-full border-2 whitespace-nowrap transition-all",
                                    selectedStylist?.id === stylist.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                                )}
                            >
                                {stylist.name}
                            </button>
                        ))}
                    </div>

                    {/* Week View - Google Calendar Style */}
                    <Card className="border-2">
                        <CardContent className="p-0">
                            {/* Week Header */}
                            <div className="grid grid-cols-8 border-b-2">
                                <div className="p-4 border-r-2 bg-secondary/20">
                                    <Calendar className="w-5 h-5 text-muted-foreground" />
                                </div>
                                {weekDates.map((date, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(date)}
                                        className={cn(
                                            "p-4 border-r-2 text-center transition-all hover:bg-primary/5",
                                            isSelected(date) && "bg-primary/10",
                                            isToday(date) && "bg-blue-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "text-xs font-medium",
                                            isToday(date) && "text-blue-600"
                                        )}>
                                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </div>
                                        <div className={cn(
                                            "text-2xl font-bold mt-1",
                                            isSelected(date) && "text-primary",
                                            isToday(date) && "text-blue-600"
                                        )}>
                                            {date.getDate()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {date.toLocaleDateString('en-US', { month: 'short' })}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Time Slots Grid */}
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="max-h-[500px] overflow-y-auto">
                                    {generateDayTimeSlots().map((timeStr) => {
                                        const available = isSlotAvailable(timeStr);
                                        const slotInfo = getSlotInfo(timeStr);

                                        return (
                                            <div key={timeStr} className="grid grid-cols-8 border-b hover:bg-secondary/20">
                                                <div className="p-3 border-r-2 text-sm font-medium text-muted-foreground bg-secondary/10">
                                                    {timeStr}
                                                </div>
                                                <div className="col-span-7 p-2">
                                                    {available && slotInfo ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSlot(slotInfo);
                                                                setStep(3);
                                                            }}
                                                            className="w-full text-left p-3 rounded-lg bg-primary/10 hover:bg-primary/20 border-l-4 border-primary transition-all group"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-semibold text-primary group-hover:text-primary/80">
                                                                        {formatTime(slotInfo.start)}
                                                                    </div>
                                                                    {slotInfo.stylist_name && (
                                                                        <div className="text-xs text-muted-foreground mt-1">
                                                                            with {slotInfo.stylist_name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {selectedService?.duration_minutes} min
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <div className="w-full p-3 text-sm text-muted-foreground/50">
                                                            Not available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                            ← Back
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Step 3: Client Details */}
            {step === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl mx-auto">
                    <h2 className="text-3xl font-serif text-center mb-8">Your Information</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={clientEmail}
                                onChange={(e) => setClientEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Phone Number (WhatsApp)
                            </label>
                            <input
                                type="tel"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                placeholder="+94 779 336 857"
                                className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">
                            ← Back
                        </Button>
                        <Button
                            onClick={handleBooking}
                            disabled={!clientName || !clientEmail || !clientPhone || loading}
                            className="flex-1"
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Confirm Booking
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && bookingConfirmed && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-8 max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-serif">Booking Confirmed!</h2>

                    <div className="bg-secondary/20 p-6 rounded-lg text-left space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Service:</span>
                            <span className="font-medium">{selectedService?.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{selectedDate && formatDate(selectedDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-medium">{selectedSlot && formatTime(selectedSlot.start)}</span>
                        </div>
                        <div className="border-t border-border pt-3 mt-3 flex justify-between">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-bold text-lg text-primary">LKR {selectedService?.price.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-border pt-3 mt-3">
                            <p className="text-sm text-muted-foreground mb-3">
                                📱 WhatsApp confirmation ready for: {clientPhone}
                            </p>
                            {whatsappLink && (
                                <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    Send to WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    <Button onClick={() => {
                        setStep(1);
                        setSelectedService(null);
                        setSelectedSlot(null);
                        setClientName('');
                        setClientEmail('');
                        setClientPhone('');
                        setBookingConfirmed(false);
                    }} className="w-full">
                        Book Another Appointment
                    </Button>
                </motion.div>
            )}
        </div>
    );
}
