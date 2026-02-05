'use client';

import { motion } from "framer-motion";
import { Clock, Leaf, Scissors } from "lucide-react";

const highlights = [
    {
        icon: Clock,
        title: "Zero Waiting Time",
        description: "Your time is respected. We start exactly when booked."
    },
    {
        icon: Leaf,
        title: "Premium Organic",
        description: "Only the finest global brands, curated for your health."
    },
    {
        icon: Scissors,
        title: "Expert Stylists",
        description: "International techniques, personalized for you."
    }
];

export default function HighlightSection() {
    return (
        <section className="py-24 bg-background text-foreground relative z-10">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {highlights.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.2, duration: 0.8 }}
                            viewport={{ once: true }}
                            className="flex flex-col items-center text-center space-y-4 group"
                        >
                            <div className="p-6 rounded-full bg-secondary/30 text-primary border border-secondary transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/50">
                                <item.icon size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-2xl font-serif">{item.title}</h3>
                            <p className="text-muted-foreground font-light max-w-xs">{item.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
