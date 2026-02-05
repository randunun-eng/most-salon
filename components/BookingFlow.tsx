'use client';

import { useBookingStore } from "@/lib/store";
import { services, branches, stylists } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function BookingFlow() {
    const store = useBookingStore();
    const searchParams = useSearchParams();

    // Initialize service from URL if present
    useEffect(() => {
        const serviceId = searchParams.get("service");
        if (serviceId && !store.selectedService) {
            const service = services.find(s => s.id === serviceId);
            if (service) {
                store.setService(service);
                // If service is pre-selected, we assume user starts flow or we can skip? 
                // Let's keep strict flow: Branch -> Service. 
                // If service is in URL, keep it in store but user still selects branch first.
            }
        }
    }, [searchParams, store]);


    const nextStep = () => store.setStep(store.step + 1);
    const prevStep = () => store.setStep(store.step - 1);

    const steps = [
        { id: 1, title: "Select Salon" },
        { id: 2, title: "Choose Service" },
        { id: 3, title: "Pick Stylist" },
        { id: 4, title: "Date & Time" },
        { id: 5, title: "Enter Details" },
        { id: 6, title: "Confirm" }
    ];

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Progress Indicator */}
            <div className="flex justify-between mb-8 px-2 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary/30 -z-10" />
                {steps.map((s) => (
                    <div key={s.id} className="flex flex-col items-center gap-2 bg-background px-2">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300",
                            store.step >= s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        )}>
                            {store.step > s.id ? <Check className="w-4 h-4" /> : s.id}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider hidden md:block">{s.title}</span>
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={store.step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="border-border/50 shadow-lg min-h-[400px]">
                        <CardContent className="p-6">
                            {/* Step 1: Branch */}
                            {store.step === 1 && (
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-serif mb-6 text-center">Select Location</h2>
                                    {branches.map((branch) => (
                                        <button
                                            key={branch.id}
                                            onClick={() => { store.setBranch(branch); nextStep(); }}
                                            className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-secondary/10 transition-all flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-medium text-lg">{branch.name}</div>
                                                <div className="text-sm text-muted-foreground">{branch.address}</div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Step 2: Service */}
                            {store.step === 2 && (
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-serif mb-6 text-center">Select Service</h2>
                                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                                        {services.map((service) => (
                                            <button
                                                key={service.id}
                                                onClick={() => { store.setService(service); nextStep(); }}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-lg border transition-all flex justify-between items-center group",
                                                    store.selectedService?.id === service.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                )}
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium">{service.name}</div>
                                                    <div className="text-sm text-muted-foreground flex gap-3">
                                                        <span>{service.duration}</span>
                                                        <span>•</span>
                                                        <span>{service.price}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Stylist */}
                            {store.step === 3 && (
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-serif mb-6 text-center">Choose Stylist</h2>
                                    {stylists.map((stylist) => (
                                        <button
                                            key={stylist.id}
                                            onClick={() => { store.setStylist(stylist); nextStep(); }}
                                            className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-secondary/10 transition-all flex items-center gap-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center font-serif text-xl">
                                                {stylist.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-lg">{stylist.name}</div>
                                                <div className="text-sm text-muted-foreground">{stylist.role}</div>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => { store.setStylist({ id: 'any', name: 'First Available', role: 'Any Specialist' }); nextStep(); }}
                                        className="w-full text-center p-4 text-primary hover:underline text-sm"
                                    >
                                        Skip (Any Specialist)
                                    </button>
                                </div>
                            )}

                            {/* Step 4: Date/Time (Mock) */}
                            {store.step === 4 && (
                                <div className="space-y-4 text-center">
                                    <h2 className="text-2xl font-serif mb-6">Select Time</h2>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "4:00 PM", "5:30 PM"].map((time) => (
                                            <Button key={time} variant="outline" onClick={() => { store.setTime(time); nextStep(); }}>
                                                {time}
                                            </Button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-4">* Mock availability for demo</p>
                                </div>
                            )}

                            {/* Step 5: Client Details */}
                            {store.step === 5 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-serif mb-6 text-center">Your Details</h2>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label htmlFor="clientName" className="text-sm font-medium">Full Name</label>
                                            <input
                                                id="clientName"
                                                type="text"
                                                placeholder="Enter your full name"
                                                value={store.clientName}
                                                onChange={(e) => store.setClientName(e.target.value)}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="clientPhone" className="text-sm font-medium">Phone Number</label>
                                            <input
                                                id="clientPhone"
                                                type="tel"
                                                placeholder="Enter your phone number"
                                                value={store.clientPhone}
                                                onChange={(e) => store.setClientPhone(e.target.value)}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full mt-4"
                                        disabled={!store.clientName || !store.clientPhone}
                                        onClick={nextStep}
                                    >
                                        Review Booking
                                    </Button>
                                </div>
                            )}

                            {/* Step 6: Confirm */}
                            {store.step === 6 && (
                                <div className="text-center space-y-6">
                                    <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-2xl font-serif">Booking Confirmed</h2>
                                    <div className="bg-secondary/20 p-6 rounded-lg text-left space-y-3">
                                        <p><strong>Name:</strong> {store.clientName}</p>
                                        <p><strong>Phone:</strong> {store.clientPhone}</p>
                                        <div className="h-px bg-border/50 my-2" />
                                        <p><strong>Location:</strong> {store.selectedBranch?.name}</p>
                                        <p><strong>Service:</strong> {store.selectedService?.name}</p>
                                        <p><strong>Stylist:</strong> {store.selectedStylist?.name}</p>
                                        <p><strong>Time:</strong> {store.selectedTime} (Tomorrow)</p>
                                    </div>
                                    <Button className="w-full uppercase tracking-widest" onClick={() => { store.reset(); }}>
                                        Book Another
                                    </Button>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            {store.step > 1 && store.step < 6 && (
                <div className="mt-6 flex justify-between">
                    <Button variant="ghost" onClick={prevStep}>
                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                </div>
            )}
        </div>
    );
}
