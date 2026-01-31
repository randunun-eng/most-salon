import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import BackgroundAudio from "@/components/BackgroundAudio";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <BackgroundAudio />
      <Navbar />

      <Hero />

      {/* Value Props / Why MOST */}
      <section className="py-24 px-4 container mx-auto bg-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-secondary/30 flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="font-serif text-2xl">Premium Hygiene</h3>
            <p className="text-muted-foreground">Hospital-grade sterilization with single-use kits for every client.</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-secondary/30 flex items-center justify-center">
              <span className="text-2xl">🌿</span>
            </div>
            <h3 className="font-serif text-2xl">Organic Products</h3>
            <p className="text-muted-foreground">Curated collection of the finest organic and vegan beauty products.</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-secondary/30 flex items-center justify-center">
              <span className="text-2xl">💎</span>
            </div>
            <h3 className="font-serif text-2xl">Expert Stylists</h3>
            <p className="text-muted-foreground">Master-level professionals dedicated to personalized perfection.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-secondary/10">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-5xl font-serif text-center mb-16">Client Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card p-8 shadow-sm border border-border/50">
              <div className="flex gap-1 mb-4 text-accent">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-lg italic mb-6">"The most relaxing facial I've ever had. The attention to detail is unmatched in the city."</p>
              <p className="font-bold text-sm uppercase tracking-wider">- Sarah Jenkins</p>
            </div>
            <div className="bg-card p-8 shadow-sm border border-border/50">
              <div className="flex gap-1 mb-4 text-accent">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-lg italic mb-6">"Finally, a salon that understands minimal luxury. My hair has never looked better."</p>
              <p className="font-bold text-sm uppercase tracking-wider">- Michelle Ko</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 bg-primary text-primary-foreground text-center">
        <h2 className="text-4xl md:text-6xl font-serif mb-8">Ready for your transformation?</h2>
        <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90 text-lg h-14 px-10 rounded-none uppercase tracking-widest">
          <Link href="/booking">Book Your Visit</Link>
        </Button>
      </section>

      <footer className="py-12 px-4 bg-foreground text-background text-center text-sm md:flex md:justify-between container mx-auto items-center">
        <div className="mb-4 md:mb-0">
          <span className="font-serif text-xl font-bold">MOST</span> <span className="opacity-50 mx-2">|</span> Luxury Beauty Salon
        </div>
        <div className="opacity-50">
          &copy; {new Date().getFullYear()} MOST. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
