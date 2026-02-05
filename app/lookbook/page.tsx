'use client';

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { motion } from "framer-motion";

const images = [
    { id: 1, src: "/assets/lookbook_hair_1.png", category: "Hair" },
    { id: 2, src: "/assets/lookbook_nails_1.png", category: "Nails" },
    { id: 3, src: "/assets/lookbook_makeup_1.png", category: "Makeup" },
    { id: 4, src: "/assets/lookbook_hair_2.png", category: "Hair" },
    { id: 5, src: "/assets/lookbook_face_1.png", category: "Facials" },
    { id: 6, src: "/assets/lookbook_nails_2.png", category: "Nails" },
];

export default function LookbookPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-32 pb-20 container mx-auto px-4">
                <h1 className="text-4xl md:text-6xl font-serif text-center mb-6">Lookbook</h1>
                <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
                    A curated collection of our finest work, inspired by modern elegance and timeless beauty.
                </p>

                {/* Masonry Grid Simulation */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                    {images.map((img, index) => (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="break-inside-avoid"
                        >
                            <div className="relative aspect-[3/4] bg-secondary/20 overflow-hidden group">
                                <Image
                                    src={img.src}
                                    alt={img.category}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
                                <div className="absolute inset-0 flex items-center justify-center text-white/90 font-serif text-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-4 group-hover:translate-y-0">
                                    {img.category}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
            <Footer />
        </main>
    );
}
