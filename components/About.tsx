'use client';

import { motion } from "framer-motion";

export default function About() {
    return (
        <section className="py-32 bg-background relative overflow-hidden">
            <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                    viewport={{ once: true }}
                >
                    <span className="text-primary text-sm tracking-[0.3em] uppercase mb-6 block">Our Philosophy</span>
                    <h2 className="text-4xl md:text-6xl font-serif mb-12 leading-tight">
                        Redefining Luxury in<br /><span className="text-primary italic">Sri Lanka</span>
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed mb-12">
                        With over a decade of trust, THE MOST has established itself as the pinnacle of beauty and care.
                        We believe in a culture of zero waiting, where your time is as valued as your appearance.
                        Our family of expert stylists uses only premium global products to ensure you leave not just looking better,
                        but feeling exceptional.
                    </p>
                    <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
                </motion.div>
            </div>
        </section>
    );
}
