'use client';

import { motion } from "framer-motion";

const brands = [
    "ALFAPARF MILANO",
    "L'ORÉAL PROFESSIONNEL",
    "WELLA PROFESSIONALS",
    "SCHWARZKOPF",
    "OLAPLEX",
    "KÉRASTASE"
];

export default function BrandStrip() {
    return (
        <section className="py-12 bg-secondary/20 border-y border-white/5 overflow-hidden">
            <div className="flex">
                <motion.div
                    className="flex gap-16 md:gap-32 px-16 whitespace-nowrap"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                >
                    {[...brands, ...brands].map((brand, i) => (
                        <span
                            key={i}
                            className="text-xl md:text-3xl font-serif text-white/30 tracking-[0.2em] hover:text-primary/80 transition-colors uppercase"
                        >
                            {brand}
                        </span>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
