'use client';

import Navbar from "@/components/Navbar";
import BookingFlow from "@/components/BookingFlow";
import BackgroundAudio from "@/components/BackgroundAudio";
import { Suspense } from "react";
import FadeIn from "@/components/FadeIn";

export default function BookingPage() {
    return (
        <main className="min-h-screen bg-background">
            <BackgroundAudio />
            <Navbar />
            <div className="pt-32 pb-20 container mx-auto px-4 max-w-4xl">
                <FadeIn>
                    <h1 className="text-4xl md:text-6xl font-serif text-center mb-4">Book Your Visit</h1>
                    <p className="text-center text-muted-foreground mb-12">Select your preferred services and time.</p>
                </FadeIn>
                <FadeIn delay={0.2}>
                    <div className="bg-card border border-border/50 shadow-sm p-6 md:p-8">
                        <Suspense fallback={<div className="text-center text-muted-foreground py-20">Loading booking experience...</div>}>
                            <BookingFlow />
                        </Suspense>
                    </div>
                </FadeIn>
            </div>

        </main>
    );
}


