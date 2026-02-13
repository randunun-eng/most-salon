'use client';

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const reviews = [
    {
        name: "Shenaya D.",
        text: "The ambiance is unmatched. Finally a place in Colombo that feels truly international.",
        rating: 5
    },
    {
        name: "Aravinda P.",
        text: "Zero waiting time is real. I walked in and was seated immediately. Fantastic cut.",
        rating: 5
    },
    {
        name: "Michelle K.",
        text: "The organic products made such a difference to my hair texture. Highly recommended!",
        rating: 5
    }
];

export default function ClientStories() {
    return (
        <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/60 z-10" />
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover grayscale opacity-50"
                >
                    <source src="/videos/clientstories.mp4" type="video/mp4" />
                </video>
            </div>

            <div className="container relative z-20 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-6xl font-serif text-white mb-4">Client Stories</h2>
                    <div className="flex justify-center items-center gap-2 text-primary">
                        <span className="text-white text-sm tracking-widest uppercase">Ranked #1 on Google Reviews</span>
                        <div className="flex"><Star className="fill-primary h-4 w-4" /><Star className="fill-primary h-4 w-4" /><Star className="fill-primary h-4 w-4" /><Star className="fill-primary h-4 w-4" /><Star className="fill-primary h-4 w-4" /></div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {reviews.map((review, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2, duration: 0.8 }}
                            className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <div className="flex gap-1 mb-4 text-primary">
                                {[...Array(review.rating)].map((_, r) => (
                                    <Star key={r} size={16} className="fill-current" />
                                ))}
                            </div>
                            <p className="text-white/90 font-light italic mb-6 leading-relaxed">"{review.text}"</p>
                            <p className="text-primary text-xs uppercase tracking-widest font-bold">- {review.name}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
