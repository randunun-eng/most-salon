'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero() {
    return (
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-secondary/20">
            {/* Background Layer - Placeholder for Image/Video */}
            <div className="absolute inset-0 z-0">
                {/* Gradient overlay to ensure text contrast if we add image later */}
                <div className="absolute inset-0 bg-gradient-to-b from-background/10 to-background/40" />
                {/* Mock Visual: A subtle luxury texture or solid color for now */}
                <div className="w-full h-full bg-[#F7F5F2]" />
            </div>

            <div className="container relative z-10 px-4 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-5xl md:text-7xl lg:text-9xl font-serif font-medium text-foreground tracking-tight mb-6">
                        MOST
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                >
                    <p className="text-lg md:text-xl text-foreground/70 tracking-widest uppercase mb-10 max-w-md mx-auto">
                        Luxury Beauty & Wellness
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row gap-4"
                >
                    <Button asChild size="lg" className="h-12 px-8 bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground uppercase tracking-widest text-sm rounded-none">
                        <Link href="/booking">Book Appointment</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="h-12 px-8 border-foreground/20 hover:bg-foreground/5 uppercase tracking-widest text-sm rounded-none">
                        <Link href="/services">Explore Services</Link>
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
