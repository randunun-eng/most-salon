'use client';

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

// Mock images (using placeholders for now, in real app use Next Image)
const images = [
    { id: 1, src: "/images/look1.jpg", category: "Hair" }, // Placeholder paths
    { id: 2, src: "/images/look2.jpg", category: "Nails" },
    { id: 3, src: "/images/look3.jpg", category: "Makeup" },
    { id: 4, src: "/images/look4.jpg", category: "Hair" },
    { id: 5, src: "/images/look5.jpg", category: "Face" },
    { id: 6, src: "/images/look6.jpg", category: "Nails" },
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
                                {/* Placeholder visual */}
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-serif text-4xl">
                                    {img.category}
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
            <Footer />
        </main>
    );
}
