'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, User, Mail, Phone, Check, Loader2, Calendar, Clock, X } from 'lucide-react';
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

export default function MobileOptimizedBooking() {
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

    // Mobile-friendly week dates
    const [weekDates, setWeekDates] = useState<Date[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState(0);

    useEffect(() => {
        fetchStylists();
        fetchServices();
        generateWeekDates();
    }, []);

    useEffect(() => {
        if (selectedService && selectedDate) {
            fetchAvailability();
        }
    }, [selectedService, selectedStylist, selectedDate]);

    const generateWeekDates = () => {
        const today = new Date();
        const dates: Date[] = [];
        for (let i = 0; i < 14; i++) {
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

    const getVisibleDates = () => {
        return weekDates.slice(currentWeekStart, currentWeekStart + 5);
    };

    const nextWeek = () => {
        if (currentWeekStart + 5 < weekDates.length) {
            setCurrentWeekStart(currentWeekStart + 5);
        }
    };

    const prevWeek = () => {
        if (currentWeekStart > 0) {
            setCurrentWeekStart(Math.max(0, currentWeekStart - 5));
        }
    };

    return (
        <div className="w-full min-h-screen bg-background pb-20">
            {/* Fixed Header */}
            <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-serif">Book Appointment</h1>
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="text-sm text-primary flex items-center gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 flex gap-1">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-all",
                                    step >= s ? "bg-primary" : "bg-secondary"
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-4 py-6">
                <AnimatePresence mode="wait">
                    {/* Step 1: Select Service */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <h2 className="text-2xl font-serif mb-4">Select Service</h2>
                            {services.map((service) => (
                                <button
                                    key={service.id}
                                    onClick={() => {
                                        setSelectedService(service);
                                        setStep(2);
                                    }}
                                    className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-98"
                                >
                                    <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {service.duration_minutes} min
                                        </span>
                                        <span className="font-medium text-primary">
                                            LKR {service.price.toLocaleString()}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* Step 2: Select Date & Time */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            {/* Service Summary */}
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                <div className="text-sm text-muted-foreground">Selected Service</div>
                                <div className="font-semibold text-lg">{selectedService?.name}</div>
                                <div className="text-sm text-muted-foreground">
                                    {selectedService?.duration_minutes} min • LKR {selectedService?.price.toLocaleString()}
                                </div>
                            </div>

                            {/* Stylist Selection */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">Choose Stylist</h3>
                                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                                    <button
                                        onClick={() => setSelectedStylist(null)}
                                        className={cn(
                                            "px-4 py-2 rounded-full border-2 whitespace-nowrap text-sm transition-all flex-shrink-0",
                                            !selectedStylist ? "border-primary bg-primary text-white" : "border-border"
                                        )}
                                    >
                                        Any Stylist
                                    </button>
                                    {stylists.map((stylist) => (
                                        <button
                                            key={stylist.id}
                                            onClick={() => setSelectedStylist(stylist)}
                                            className={cn(
                                                "px-4 py-2 rounded-full border-2 whitespace-nowrap text-sm transition-all flex-shrink-0",
                                                selectedStylist?.id === stylist.id ? "border-primary bg-primary text-white" : "border-border"
                                            )}
                                        >
                                            {stylist.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Selector */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">Select Date</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={prevWeek}
                                        disabled={currentWeekStart === 0}
                                        className="p-2 rounded-lg border disabled:opacity-30"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <div className="flex-1 grid grid-cols-5 gap-2">
                                        {getVisibleDates().map((date, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedDate(date)}
                                                className={cn(
                                                    "p-3 rounded-xl border-2 transition-all text-center",
                                                    isSelected(date) && "border-primary bg-primary text-white",
                                                    !isSelected(date) && isToday(date) && "border-blue-500 bg-blue-50",
                                                    !isSelected(date) && !isToday(date) && "border-border"
                                                )}
                                            >
                                                <div className="text-xs font-medium opacity-80">
                                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </div>
                                                <div className="text-xl font-bold mt-1">
                                                    {date.getDate()}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={nextWeek}
                                        disabled={currentWeekStart + 5 >= weekDates.length}
                                        className="p-2 rounded-lg border disabled:opacity-30"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Time Slots */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">
                                    Available Times - {formatDate(selectedDate)}
                                </h3>
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : availableSlots.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {availableSlots.map((slot, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedSlot(slot);
                                                    setStep(3);
                                                }}
                                                className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
                                            >
                                                <div className="font-semibold text-lg">
                                                    {formatTime(slot.start)}
                                                </div>
                                                {slot.stylist_name && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {slot.stylist_name}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                        No slots available for this date
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Client Details */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <h2 className="text-2xl font-serif mb-4">Your Details</h2>

                            {/* Booking Summary */}
                            <div className="bg-secondary/20 p-4 rounded-xl space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Service:</span>
                                    <span className="font-medium">{selectedService?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium">{formatDate(selectedDate)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Time:</span>
                                    <span className="font-medium">{selectedSlot && formatTime(selectedSlot.start)}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none text-base"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={clientEmail}
                                        onChange={(e) => setClientEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none text-base"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">WhatsApp Number</label>
                                    <input
                                        type="tel"
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        placeholder="+94 779 336 857"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none text-base"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        We'll send confirmation via WhatsApp
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleBooking}
                                disabled={!clientName || !clientEmail || !clientPhone || loading}
                                className="w-full py-6 text-lg rounded-xl"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Confirming...
                                    </>
                                ) : (
                                    'Confirm Booking'
                                )}
                            </Button>
                        </motion.div>
                    )}

                    {/* Step 4: Confirmation */}
                    {step === 4 && bookingConfirmed && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-6 py-8"
                        >
                            <div className="w-20 h-20 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <Check className="w-10 h-10" />
                            </div>

                            <div>
                                <h2 className="text-3xl font-serif mb-2">Confirmed!</h2>
                                <p className="text-muted-foreground">Your appointment is booked</p>
                            </div>

                            <div className="bg-secondary/20 p-6 rounded-xl text-left space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Service:</span>
                                    <span className="font-medium">{selectedService?.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium">{formatDate(selectedDate)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Time:</span>
                                    <span className="font-medium">{selectedSlot && formatTime(selectedSlot.start)}</span>
                                </div>
                                <div className="border-t border-border pt-3 mt-3 flex justify-between">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-bold text-xl text-primary">
                                        LKR {selectedService?.price.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {whatsappLink && (
                                <a
                                    href={whatsappLink}
                                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium text-lg active:scale-95"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    Send to WhatsApp
                                </a>
                            )}

                            <Button
                                onClick={() => {
                                    setStep(1);
                                    setSelectedService(null);
                                    setSelectedSlot(null);
                                    setClientName('');
                                    setClientEmail('');
                                    setClientPhone('');
                                    setBookingConfirmed(false);
                                }}
                                variant="outline"
                                className="w-full py-4 rounded-xl"
                            >
                                Book Another
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
