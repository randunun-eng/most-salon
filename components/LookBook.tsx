'use client';

import { motion } from "framer-motion";
import Image from "next/image";

// Using the generated images (assuming they exist now)
const looks = [
    "/images/lookbook3.png",
    "/images/lookbook4.png",
    "/images/lookbook5.png",
    "/images/lookbook6.png",
    "/images/lookbook7.png",
    "/images/lookbook8.png"
];

export default function LookBook() {
    return (
        <section className="py-24 bg-background overflow-hidden">
            <div className="container mx-auto px-4 mb-16 text-center">
                <h2 className="text-4xl md:text-6xl font-serif mb-4">The LookBook</h2>
                <p className="text-muted-foreground uppercase tracking-widest">Modern Sri Lankan Elegance</p>
            </div>

            <div className="relative w-full overflow-hidden">
                <motion.div
                    className="flex gap-8 px-4 md:px-32"
                    drag="x"
                    dragConstraints={{ right: 0, left: -1000 }} // Simple drag constraint
                >
                    {looks.map((src, i) => (
                        <motion.div
                            key={i}
                            className="min-w-[300px] md:min-w-[400px] aspect-[3/4] relative rounded-lg overflow-hidden shrink-0 group"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Image
                                src={src}
                                alt="Lookbook Style"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                <span className="text-white font-serif text-xl italic">Signature Style</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
