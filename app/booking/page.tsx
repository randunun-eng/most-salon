import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingFlow from "@/components/BookingFlow";
import BackgroundAudio from "@/components/BackgroundAudio";
import { Suspense } from "react";

export default function BookingPage() {
    return (
        <main className="min-h-screen bg-background">
            <BackgroundAudio />
            <Navbar />
            <div className="pt-32 pb-20 container mx-auto px-4">
                <h1 className="text-3xl md:text-5xl font-serif text-center mb-12">Book Your Visit</h1>
                <Suspense fallback={<div className="text-center text-muted-foreground">Loading booking...</div>}>
                    <BookingFlow />
                </Suspense>
            </div>

        </main>
    );
}
