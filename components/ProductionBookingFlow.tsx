'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Clock, User, Mail, Phone, Check, Loader2, Calendar as CalendarIcon } from 'lucide-react';
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

export default function EnhancedBookingFlow() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form data
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [bookingConfirmed, setBookingConfirmed] = useState(false);
    const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
    const [whatsappLink, setWhatsappLink] = useState<string>('');

    // Fetch stylists and services on mount
    useEffect(() => {
        fetchStylists();
        fetchServices();
    }, []);

    // Fetch available slots when service, stylist, and date are selected
    useEffect(() => {
        if (selectedService && selectedDate) {
            fetchAvailability();
        }
    }, [selectedService, selectedStylist, selectedDate]);

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
                setConfirmedBooking(booking);
                setBookingConfirmed(true);
                setStep(5);

                // Send WhatsApp notification
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
                console.log('WhatsApp Link:', data.waLink);
                console.log('Message Preview:', data.preview);
            }
        } catch (error) {
            console.error('Error sending WhatsApp notification:', error);
        }
    };

    const resetBooking = () => {
        setStep(1);
        setSelectedService(null);
        setSelectedStylist(null);
        setSelectedDate(null);
        setSelectedSlot(null);
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setBookingConfirmed(false);
        setConfirmedBooking(null);
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Disable past dates in calendar
    const tileDisabled = ({ date }: { date: Date }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* Progress Steps */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary/30 -z-10" />
                {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2 bg-background px-2">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                            step >= s ? "bg-primary text-primary-foreground scale-110" : "bg-secondary text-muted-foreground"
                        )}>
                            {step > s ? <Check className="w-5 h-5" /> : s}
                        </div>
                        <span className="text-xs hidden md:block">
                            {s === 1 && 'Service'}
                            {s === 2 && 'Stylist'}
                            {s === 3 && 'Date & Time'}
                            {s === 4 && 'Details'}
                            {s === 5 && 'Confirm'}
                        </span>
                    </div>
                ))}
            </div>

            <Card className="border-border/50 shadow-xl min-h-[600px]">
                <CardContent className="p-8">
                    {/* Step 1: Select Service */}
                    {step === 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-serif mb-2">Select Your Service</h2>
                                <p className="text-muted-foreground">Choose the service you'd like to book</p>
                            </div>
                            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
                                {services.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => {
                                            setSelectedService(service);
                                            setStep(2);
                                        }}
                                        className="text-left p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                                                    {service.name}
                                                </h3>
                                                <div className="flex gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {service.duration_minutes} min
                                                    </span>
                                                    <span className="font-medium text-primary">
                                                        LKR {service.price.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Select Stylist */}
                    {step === 2 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-serif mb-2">Choose Your Stylist</h2>
                                <p className="text-muted-foreground">Select a preferred stylist or let us assign one</p>
                            </div>
                            <div className="grid gap-4">
                                {stylists.map((stylist) => (
                                    <button
                                        key={stylist.id}
                                        onClick={() => {
                                            setSelectedStylist(stylist);
                                            setStep(3);
                                        }}
                                        className="text-left p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-serif group-hover:scale-110 transition-transform">
                                            {stylist.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                                                {stylist.name}
                                            </h3>
                                            {stylist.bio && (
                                                <p className="text-sm text-muted-foreground">{stylist.bio}</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setSelectedStylist(null);
                                        setStep(3);
                                    }}
                                    className="text-center p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-primary"
                                >
                                    <User className="w-6 h-6 mx-auto mb-2" />
                                    <span className="font-medium">Any Available Stylist</span>
                                </button>
                            </div>
                            <Button variant="ghost" onClick={() => setStep(1)} className="w-full">
                                ← Back
                            </Button>
                        </motion.div>
                    )}

                    {/* Step 3: Select Date & Time with Calendar */}
                    {step === 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-serif mb-2">Pick Date & Time</h2>
                                <p className="text-muted-foreground">Select your preferred appointment time</p>
                            </div>

                            {/* Calendar View */}
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Calendar */}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" />
                                        Select Date
                                    </label>
                                    <div className="calendar-container">
                                        <Calendar
                                            onChange={(value) => setSelectedDate(value as Date)}
                                            value={selectedDate}
                                            tileDisabled={tileDisabled}
                                            minDate={new Date()}
                                            className="rounded-lg border-2 border-border shadow-lg w-full"
                                        />
                                    </div>
                                </div>

                                {/* Time Slots */}
                                <div className="flex-1">
                                    {selectedDate && (
                                        <>
                                            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Available Times for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </label>
                                            {loading ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                </div>
                                            ) : availableSlots.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                                    {availableSlots.map((slot, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                setSelectedSlot(slot);
                                                                setStep(4);
                                                            }}
                                                            className="p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
                                                        >
                                                            <div className="text-base font-semibold group-hover:text-primary transition-colors">
                                                                {formatTime(slot.start)}
                                                            </div>
                                                            {slot.stylist_name && (
                                                                <div className="text-xs text-muted-foreground mt-1">{slot.stylist_name}</div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                                                    No available slots for this date. Please try another day.
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {!selectedDate && (
                                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                                            Please select a date from the calendar
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button variant="ghost" onClick={() => setStep(2)} className="w-full">
                                ← Back
                            </Button>
                        </motion.div>
                    )}

                    {/* Step 4: Client Details */}
                    {step === 4 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-serif mb-2">Your Information</h2>
                                <p className="text-muted-foreground">Please provide your contact details</p>
                            </div>

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
                                        className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none transition-colors"
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
                                        className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none transition-colors"
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
                                        placeholder="+94 77 123 4567"
                                        className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none transition-colors"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        We'll send booking confirmation via WhatsApp
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setStep(3)} className="flex-1">
                                    ← Back
                                </Button>
                                <Button
                                    onClick={handleBooking}
                                    disabled={!clientName || !clientEmail || !clientPhone || loading}
                                    className="flex-1"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Booking...
                                        </>
                                    ) : (
                                        'Confirm Booking'
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 5: Confirmation */}
                    {step === 5 && bookingConfirmed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-6 py-8"
                        >
                            <div className="w-20 h-20 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <Check className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-serif">Booking Confirmed!</h2>
                            <p className="text-muted-foreground">
                                Your appointment has been successfully booked. We've sent a confirmation to your WhatsApp.
                            </p>

                            <div className="bg-secondary/20 p-6 rounded-lg text-left space-y-3 max-w-md mx-auto">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Service:</span>
                                    <span className="font-medium">{selectedService?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Stylist:</span>
                                    <span className="font-medium">
                                        {selectedSlot?.stylist_name || selectedStylist?.name || 'First Available'}
                                    </span>
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
                                    <span className="font-bold text-lg text-primary">
                                        LKR {selectedService?.price.toLocaleString()}
                                    </span>
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
                                            Send to WhatsApp (Test)
                                        </a>
                                    )}
                                </div>
                            </div>

                            <Button onClick={resetBooking} className="w-full max-w-md uppercase tracking-wider">
                                Book Another Appointment
                            </Button>
                        </motion.div>
                    )}
                </CardContent>
            </Card>

            <style jsx global>{`
        .calendar-container .react-calendar {
          border: none !important;
          font-family: inherit;
        }
        
        .react-calendar__tile {
          padding: 1em 0.5em;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: hsl(var(--primary) / 0.1);
        }
        
        .react-calendar__tile--active {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
        
        .react-calendar__tile--now {
          background-color: hsl(var(--secondary));
        }
        
        .react-calendar__navigation button {
          font-size: 1.2em;
          padding: 0.5em;
        }
        
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: hsl(var(--secondary));
        }
        
        .react-calendar__month-view__days__day--weekend {
          color: hsl(var(--destructive));
        }
        
        .react-calendar__tile:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>
        </div>
    );
}
