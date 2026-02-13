'use client';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function OpeningLoader() {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (visible) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
    }, [visible]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }} // Simple fade out to reveal site
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    <video
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        onEnded={() => setVisible(false)}
                    >
                        <source src="/videos/final-opening-loader.mp4" type="video/mp4" />
                    </video>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
