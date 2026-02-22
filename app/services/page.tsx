'use client';

import { useState, useEffect } from "react";
import FadeIn from "@/components/FadeIn";
import { Service } from "@/lib/db-types";
import Navbar from "@/components/Navbar";
import ServiceCard from "@/components/ServiceCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

type ServiceCategory = "Hair" | "Nails" | "Makeup" | "Facials" | "Massage";

// Static categories and videos remain ...
const categories: ServiceCategory[] = ["Hair", "Nails", "Makeup", "Facials", "Massage"];
const categoryVideos: Record<ServiceCategory, string> = {
    "Hair": "/videos/hair.mp4",
    "Nails": "/videos/nail.mp4",
    "Makeup": "/videos/makeup.mp4",
    "Facials": "/videos/facial.mp4",
    "Massage": "/videos/massage.mp4",
};

export default function ServicesPage() {
    const [activeCategory, setActiveCategory] = useState<ServiceCategory>("Hair");
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch('/api/services');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setServices(data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch services", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchServices();
    }, []);

    // Filter services for the active category.
    // Ensure case-insensitive comparison or default behavior if category is missing
    const filteredServices = services.filter(s => (s.category || 'Hair') === activeCategory);

    return (
        <main className="min-h-screen bg-background relative">
            <Navbar />

            {/* Video Background ... (unchanged) */}
            <div className="fixed inset-0 z-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeCategory}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0"
                    >
                        <div className="absolute inset-0 bg-black/70 z-10" />
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            key={categoryVideos[activeCategory]}
                            className="w-full h-full object-cover"
                        >
                            <source src={categoryVideos[activeCategory]} type="video/mp4" />
                        </video>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Content Layer */}
            <div className="relative z-10">
                {/* Header ... (unchanged) */}
                <div className="h-[40vh] md:h-[50vh] flex items-center justify-center">
                    <div className="text-center text-white pt-16">
                        <FadeIn>
                            <h1 className="text-4xl md:text-7xl font-serif font-bold tracking-tight mb-4">{activeCategory}</h1>
                            <p className="text-lg md:text-xl font-light tracking-widest uppercase opacity-90">Curated Treatments</p>
                        </FadeIn>
                    </div>
                </div>

                {/* Tabs & Service List */}
                <div className="container mx-auto px-4 py-20">
                    <Tabs
                        defaultValue="Hair"
                        value={activeCategory}
                        onValueChange={(v) => setActiveCategory(v as ServiceCategory)}
                        className="w-full max-w-5xl mx-auto"
                    >
                        <TabsList className="grid w-full grid-cols-5 mb-12 bg-black/50 backdrop-blur-md h-14 p-1 rounded-none border border-white/10">
                            {categories.map((cat) => (
                                <TabsTrigger
                                    key={cat}
                                    value={cat}
                                    className="uppercase tracking-widest text-xs md:text-sm font-medium text-white/70 data-[state=active]:bg-primary data-[state=active]:text-black rounded-none h-full transition-all duration-300"
                                >
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="min-h-[400px]">
                            {isLoading ? (
                                <div className="text-center text-white/50 py-20">Loading services...</div>
                            ) : filteredServices.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {filteredServices.map((service, index) => (
                                        <FadeIn key={service.id} delay={index * 0.1}>
                                            <ServiceCard service={service} />
                                        </FadeIn>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-white/50 py-20">No services found in this category.</div>
                            )}
                        </div>
                    </Tabs>
                </div>
            </div>
        </main>
    );
}
