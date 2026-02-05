'use client';

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

const links = [
    { href: "/services", label: "Services" },
    { href: "/lookbook", label: "Lookbook" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { scrollY } = useScroll();
    const [hidden, setHidden] = useState(false);
    const [prevScroll, setPrevScroll] = useState(0);

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = prevScroll;
        if (latest > previous && latest > 150) {
            setHidden(true);
        } else {
            setHidden(false);
        }
        setPrevScroll(latest);
    });

    return (
        <motion.nav
            variants={{
                visible: { y: 0 },
                hidden: { y: "-100%" },
            }}
            animate={hidden ? "hidden" : "visible"}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40"
        >
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Mobile Menu */}
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-6 w-6 text-foreground" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="bg-background border-r border-border">
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <div className="flex flex-col gap-8 mt-10">
                            <Link href="/" className="text-3xl font-serif font-bold text-center" onClick={() => setIsOpen(false)}>The MOST</Link>
                            <div className="flex flex-col gap-6 items-center">
                                {links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-lg uppercase tracking-widest text-foreground/80 hover:text-accent transition-colors relative group"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {link.label}
                                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full" />
                                    </Link>
                                ))}
                                <Button asChild className="mt-4 bg-primary text-primary-foreground uppercase tracking-widest px-8">
                                    <Link href="/booking" onClick={() => setIsOpen(false)}>Book Appointment</Link>
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                <Link href="/" className="text-2xl md:text-3xl font-serif font-bold tracking-tighter">
                    The MOST
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm uppercase tracking-widest text-foreground/80 hover:text-accent transition-colors relative group"
                        >
                            {link.label}
                            {/* Animated Underline */}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full" />
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    <Button asChild size="sm" className="hidden md:inline-flex bg-primary text-primary-foreground hover:bg-accent uppercase tracking-widest text-xs px-6 rounded-none transition-transform hover:scale-105 active:scale-95">
                        <Link href="/booking">Book Now</Link>
                    </Button>
                    <Link href="/booking" className="md:hidden p-2 text-foreground hover:text-accent">
                        <ShoppingBag className="h-5 w-5" />
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}
