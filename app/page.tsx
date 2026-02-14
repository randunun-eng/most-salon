'use client';

import OpeningLoader from "@/components/OpeningLoader";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HighlightSection from "@/components/HighlightSection";
import BrandStrip from "@/components/BrandStrip";
import ClientStories from "@/components/ClientStories";
import Services from "@/components/Services";
import About from "@/components/About";
import LookBook from "@/components/LookBook";
import Footer from "@/components/Footer";
import BackgroundAudio from '@/components/BackgroundAudio';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import FadeIn from "@/components/FadeIn";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-black">
      {/* 1. Opening Animation */}
      <OpeningLoader />

      {/* Audio */}
      <BackgroundAudio />

      {/* Navigation */}
      <Navbar />

      {/* 2. Hero Section */}
      <Hero />

      {/* 3. Highlight Section (Zero Waiting, etc.) */}
      <HighlightSection />

      {/* 4. Global Brand Strip */}
      <BrandStrip />

      {/* 5. Client Stories / Reviews */}
      <ClientStories />

      {/* 6. Services Section */}
      <Services />

      {/* 7. About Section */}
      <About />

      {/* 8. LookBook */}
      <LookBook />

      {/* 9. Booking / Welcome Section (Restored & Updated) */}
      <section className="relative py-16 md:py-32 px-4 overflow-hidden bg-black text-white">
        <div className="absolute inset-0 opacity-40">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="object-cover w-full h-full"
          >
            <source src="/videos/booking.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="relative z-10 container mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <FadeIn direction="right">
            <div className="space-y-6 md:space-y-8">
              <h2 className="text-3xl md:text-4xl lg:text-6xl font-serif">Welcome to The MOST.</h2>
              <p className="text-base md:text-lg lg:text-xl text-gray-300 font-light leading-relaxed">
                Step into a world where your time is respected and your style is celebrated.
                Our team is ready to welcome you with open arms and scissors sharp.
              </p>
              <Button asChild size="lg" className="bg-white text-black hover:bg-white/90 text-base md:text-lg h-14 md:h-16 px-8 md:px-12 rounded-none uppercase tracking-widest transition-transform hover:scale-105 border-none w-full md:w-auto">
                <Link href="/booking">Book Your Visit</Link>
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="relative h-[300px] md:h-[400px] w-full border border-white/10 rounded-lg overflow-hidden flex items-end justify-center bg-gradient-to-t from-black/80 to-transparent">
              <div className="text-center p-6 md:p-8">
                <p className="text-xl md:text-2xl font-serif italic text-white/80">" We are ready for you. "</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
