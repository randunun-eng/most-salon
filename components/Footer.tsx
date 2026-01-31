import Link from "next/link";
import { Instagram, Facebook, Twitter } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-foreground text-background py-16 px-4">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
                {/* Brand */}
                <div className="flex flex-col items-center md:items-start gap-4">
                    <h2 className="font-serif text-3xl font-bold">MOST</h2>
                    <p className="text-secondary/70 max-w-xs">Luxury beauty services delivered with precision, care, and personalization.</p>
                </div>

                {/* Links */}
                <div className="flex flex-col gap-4">
                    <h3 className="font-serif text-lg font-medium text-primary">Explore</h3>
                    <Link href="/services" className="text-sm hover:text-primary transition-colors">Services</Link>
                    <Link href="/lookbook" className="text-sm hover:text-primary transition-colors">Lookbook</Link>
                    <Link href="/about" className="text-sm hover:text-primary transition-colors">About Us</Link>
                    <Link href="/booking" className="text-sm hover:text-primary transition-colors">Book Now</Link>
                </div>

                {/* Contact */}
                <div className="flex flex-col gap-4">
                    <h3 className="font-serif text-lg font-medium text-primary">Contact</h3>
                    <p className="text-sm text-secondary/70">123 Luxury Blvd, Suite 100<br />Beverly Hills, CA 90210</p>
                    <p className="text-sm text-secondary/70">+1 (310) 555-0123</p>
                    <p className="text-sm text-secondary/70">hello@mostsalon.com</p>
                </div>

                {/* Social */}
                <div className="flex flex-col items-center md:items-start gap-4">
                    <h3 className="font-serif text-lg font-medium text-primary">Follow Us</h3>
                    <div className="flex gap-4">
                        <Link href="#" className="p-2 border border-secondary/20 rounded-full hover:bg-secondary/10 transition-colors"><Instagram className="h-5 w-5" /></Link>
                        <Link href="#" className="p-2 border border-secondary/20 rounded-full hover:bg-secondary/10 transition-colors"><Facebook className="h-5 w-5" /></Link>
                    </div>
                </div>
            </div>
            <div className="mt-16 pt-8 border-t border-secondary/10 text-center text-xs opacity-40">
                &copy; {new Date().getFullYear()} MOST Beauty Salon. All rights reserved.
            </div>
        </footer>
    );
}
