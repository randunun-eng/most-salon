'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function HairCursor() {
    const mouseX = useMotionValue(-100);
    const mouseY = useMotionValue(-100);
    const [isVisible, setIsVisible] = useState(false);

    // Smooth spring animation for "floating" feel, but responsive enough for a pointer
    const springConfig = { damping: 25, stiffness: 400 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    // Mobile detection and robust cursor visibility logic
    useEffect(() => {
        // Check if device supports hover (desktop)
        const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        if (!isDesktop) {
            return;
        }

        const moveCursor = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
            if (!isVisible) setIsVisible(true);
        };

        const handleMouseEnter = () => setIsVisible(true);
        const handleMouseLeave = () => setIsVisible(false);

        window.addEventListener('mousemove', moveCursor);
        document.body.addEventListener('mouseenter', handleMouseEnter);
        document.body.addEventListener('mouseleave', handleMouseLeave);

        // NOTE: We do NOT set document.body.style.cursor = 'none' here directly 
        // to avoid persistent loss of cursor if JS errors or resizing happens.
        // We rely on the <style> block which only renders when isVisible is true.

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            document.body.removeEventListener('mouseenter', handleMouseEnter);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isVisible]); // Add isVisible dependency effectively or keep empty if state updater handles it. 
    // Actually, accessing state in listener? No, setter is fine.

    // Safe guard: if not visible, we render nothing.
    if (!isVisible) return null;

    return (
        <>
            <style jsx global>{`
                body, a, button, [role="button"] {
                    cursor: none !important;
                }
            `}</style>
            <motion.div
                className="fixed top-0 left-0 pointer-events-none z-[99999]"
                style={{
                    x,
                    y,
                    translateX: '-10%',
                    translateY: '-10%',
                }}
            >
                {/* 
                    Using the user-provided v3 asset which is expected to have a native transparent background.
                */}
                <div className="relative w-12 h-12 opactiy-100">
                    <Image
                        src="/assets/hair_cursor_v3.png"
                        alt="Hair Cursor"
                        width={48}
                        height={48}
                        className="object-contain transform -rotate-12"
                        priority
                        unoptimized
                    />
                </div>
            </motion.div>
        </>
    );
}
