"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function BlinkingEye() {
    const [isBlinking, setIsBlinking] = useState(false);

    useEffect(() => {
        // Random blink interval between 2 and 6 seconds
        const scheduleBlink = () => {
            const delay = Math.random() * 4000 + 2000;
            const timeout = setTimeout(() => {
                setIsBlinking(true);
                // Blink duration approx 150ms
                setTimeout(() => {
                    setIsBlinking(false);
                    scheduleBlink();
                }, 150);
            }, delay);
            return timeout;
        };

        const timer = scheduleBlink();
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/60 z-10" />

            {/* Open Eye (Always visible underneath to prevent white flashes) */}
            <Image
                src="/assets/eye_makeup.png"
                alt="Transformation"
                fill
                className="object-cover"
                quality={90}
                priority
            />

            {/* Closed Eye (Fades in/out) */}
            <AnimatePresence>
                {isBlinking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.05 }} // Very fast transition for realistic blink
                        className="absolute inset-0 z-1"
                    >
                        <Image
                            src="/assets/eye_makeup_closed.png"
                            alt="Transformation Closed"
                            fill
                            className="object-cover"
                            quality={90}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
