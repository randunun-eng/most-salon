'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

const services = [
    {
        id: "hair",
        title: "Hair",
        video: "/videos/hair.mp4",
        desc: "Precision cuts, luxury coloring, and treatments by top stylists."
    },
    {
        id: "nails",
        title: "Nails",
        video: "/videos/nail.mp4",
        desc: "Long-lasting gel, acrylics, and spa manicures."
    },
    {
        id: "makeup",
        title: "Makeup",
        video: "/videos/makeup.mp4",
        desc: "Event-ready looks that highlight your natural beauty."
    },
    {
        id: "facials",
        title: "Facials",
        video: "/videos/facial.mp4",
        desc: "Rejuvenating organic therapies for glowing skin."
    },
    {
        id: "massage",
        title: "Massage",
        video: "/videos/massage.mp4",
        desc: "Deep relaxation head and shoulder massages."
    }
];

export default function Services() {
    const [activeService, setActiveService] = useState(services[0]);

    return (
        <section className="relative w-full h-[80vh] bg-black overflow-hidden flex flex-col md:flex-row">
            {/* Content Side */}
            <div className="relative z-20 w-full md:w-1/3 h-full bg-black/80 backdrop-blur-sm border-r border-white/10 flex flex-col justify-center px-8 md:px-12 py-12">
                <motion.h2
                    className="text-4xl md:text-5xl font-serif text-white mb-12"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                >
                    Our Craft
                </motion.h2>

                <div className="flex flex-col gap-6">
                    {services.map((s) => (
                        <button
                            key={s.id}
                            onMouseEnter={() => setActiveService(s)}
                            onClick={() => setActiveService(s)}
                            className={`text-left text-2xl md:text-3xl font-serif transition-colors duration-300 flex items-center justify-between group ${activeService.id === s.id ? "text-primary" : "text-white/40 hover:text-white"
                                }`}
                        >
                            <span>{s.title}</span>
                            <ArrowRight
                                className={`transition-all duration-300 ${activeService.id === s.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 group-hover:opacity-50"}`}
                                size={24}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Video Display Side */}
            <div className="relative w-full md:w-2/3 h-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeService.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                    >
                        <div className="absolute inset-0 bg-black/20 z-10" />
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            key={activeService.video} // Force reload on change
                        >
                            <source src={activeService.video} type="video/mp4" />
                        </video>

                        <motion.div
                            className="absolute bottom-12 left-12 z-20 max-w-md"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h3 className="text-white text-xl font-medium mb-2">{activeService.title}</h3>
                            <p className="text-white/80 font-light">{activeService.desc}</p>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </section>
    );
}
