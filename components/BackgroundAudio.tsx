'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BackgroundAudio() {
    const [isMuted, setIsMuted] = useState(true); // Default to muted (browser policy + user preference)
    const audioRef = useRef<HTMLAudioElement>(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        // Attempt autoplay if not muted (unlikely to work without interaction, but good to have)
        if (audioRef.current) {
            audioRef.current.volume = 0.2; // Low volume
            if (!isMuted) {
                audioRef.current.play().catch(() => {
                    // Autoplay failed, likely interaction needed
                });
            }
        }
    }, [isMuted]);

    const toggleMute = () => {
        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.play();
                setIsMuted(false);
            } else {
                audioRef.current.pause();
                setIsMuted(true);
            }
            setHasInteracted(true);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <audio ref={audioRef} loop src="/music/ambient-luxury.mp3" /> {/* Placeholder path */}
            <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-background/50 backdrop-blur-sm border-border hover:bg-background"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute background music" : "Mute background music"}
            >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
        </div>
    );
}
