'use client';

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import FadeIn from "@/components/FadeIn";
import Image from "next/image";

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />

            {/* Header */}
            <div className="relative h-[40vh] min-h-[400px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-black/50 z-10" />
                <Image
                    src="/assets/hero_salon.png"
                    alt="Contact The MOST Salon"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="relative z-20 text-center text-white pt-20">
                    <FadeIn>
                        <h1 className="text-5xl md:text-7xl font-serif mb-6">Visit Us</h1>
                        <p className="text-xl tracking-widest uppercase font-light">Experience Luxury</p>
                    </FadeIn>
                </div>
            </div>

            <div className="py-24 container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Info */}
                    <div className="space-y-12">
                        <FadeIn delay={0.2}>
                            <div className="flex gap-6">
                                <div className="h-12 w-12 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <MapPin className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-serif text-2xl mb-2">Location</h3>
                                    <p className="text-muted-foreground text-lg">Pannipitiya Road, Asiri Mawatha<br />Battaramulla, Sri Lanka</p>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.3}>
                            <div className="flex gap-6">
                                <div className="h-12 w-12 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Phone className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-serif text-2xl mb-2">Phone</h3>
                                    <p className="text-muted-foreground text-lg mb-2">072 231 6131</p>
                                    <Button variant="link" className="p-0 text-primary h-auto text-base">Chat on WhatsApp &rarr;</Button>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.4}>
                            <div className="flex gap-6">
                                <div className="h-12 w-12 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-serif text-2xl mb-2">Email</h3>
                                    <p className="text-muted-foreground text-lg">hello@mostsalon.com</p>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.5}>
                            <div className="flex gap-6">
                                <div className="h-12 w-12 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-serif text-2xl mb-4">Opening Hours</h3>
                                    <div className="text-muted-foreground grid grid-cols-[100px_1fr] gap-y-2 text-lg">
                                        <span>Mon - Sat</span>
                                        <span>9:00 AM - 8:00 PM</span>
                                        <span>Sunday</span>
                                        <span>9:00 AM - 6:00 PM</span>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    </div>

                    {/* Map Placeholder */}
                    <FadeIn delay={0.6} className="h-full min-h-[500px]">
                        <div className="bg-secondary/20 h-full w-full relative border border-border/50 overflow-hidden grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                            <iframe
                                src="https://maps.google.com/maps?q=6.9004085,79.9204618&z=19&output=embed"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="The MOST Salon Location"
                            />
                        </div>
                    </FadeIn>
                </div>
            </div>
            <Footer />
        </main>
    );
}
