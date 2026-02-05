'use client';

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

export default function Hero() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    return (
        <section ref={ref} className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black">
            {/* Background Video Layer */}
            <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/30 z-10" />
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="object-cover w-full h-full"
                >
                    <source src="/videos/hero.mp4" type="video/mp4" />
                </video>
            </motion.div>

            <div className="container relative z-10 px-4 flex flex-col items-center text-center text-white">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 2.5 }} // Delay for loader
                >
                    <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-serif font-medium tracking-tighter mb-6 leading-none drop-shadow-2xl">
                        The MOST
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 3, ease: "easeOut" }}
                >
                    <p className="text-xl md:text-2xl text-white/95 tracking-[0.2em] mb-8 max-w-3xl mx-auto font-light drop-shadow-md">
                        One Destination. Every Style. Every Generation.
                    </p>

                    {/* Feature Badge */}
                    <div className="inline-block border border-white/40 bg-white/10 backdrop-blur-md px-8 py-3 rounded-full mb-12">
                        <span className="text-xs md:text-sm font-medium tracking-wider text-white flex items-center gap-3">
                            <span>⭐ Zero Waiting Time</span>
                            <span className="text-white/50">•</span>
                            <span>Family Friendly</span>
                            <span className="text-white/50">•</span>
                            <span>Premium Care</span>
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 3.2, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row gap-6"
                >
                    <Button asChild size="lg" className="h-16 px-12 bg-white text-black hover:bg-white/90 uppercase tracking-[0.2em] text-sm rounded-none border-none transition-all duration-500 hover:scale-105">
                        <Link href="/booking">Book Experience</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="h-16 px-12 border-white/40 text-white bg-transparent hover:bg-white/10 hover:text-white uppercase tracking-[0.2em] text-sm rounded-none backdrop-blur-md transition-all duration-500 hover:scale-105">
                        <Link href="/services">Our Services</Link>
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
