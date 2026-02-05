'use client';

// Remove useChat dependency effectively by implementing local state logic
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send } from "lucide-react";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function AiBeautyChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        // Simulate network delay and thinking
        setTimeout(() => {
            let responseText = "I'm here to help you customize your beauty experience at The MOST. How can I assist you today?";
            const lowerInput = userMsg.content.toLowerCase();

            if (lowerInput.includes('facial')) {
                responseText = "For first-time visitors, I highly recommend our Hydra-Glow Facial. It's perfect for deep hydration and giving you that radiant 'glass skin' look. Would you like to book it?";
            } else if (lowerInput.includes('wedding')) {
                responseText = "Congratulations! For weddings, our Bridal Makeup package is designed to look flawless in photos and last all day. We also recommend a trial session 2 weeks prior.";
            } else if (lowerInput.includes('book')) {
                responseText = "You can easily book online by clicking the 'Book Now' button. Do you need help choosing a stylist?";
            }

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText
            };

            setMessages(prev => [...prev, assistantMsg]);
            setIsLoading(false);
        }, 1000 + Math.random() * 1000);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-20 right-4 z-50 w-full max-w-[350px] md:w-[400px]"
                    >
                        <Card className="border-border shadow-2xl overflow-hidden">
                            <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    <span className="font-serif font-medium">The MOST Assistant</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground hover:bg-primary/80" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 h-[400px] overflow-y-auto bg-secondary/10" ref={scrollRef}>
                                {messages.length === 0 && (
                                    <div className="text-center text-muted-foreground mt-20 p-4">
                                        <p className="mb-2">✨ Welcome to The MOST.</p>
                                        <p className="text-sm">Ask me about our services, skincare recommendations, or booking help.</p>
                                    </div>
                                )}
                                <div className="flex flex-col gap-4">
                                    {messages.map(m => (
                                        <div key={m.id} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                                            <div className={cn(
                                                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                                                m.role === 'user'
                                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                                    : "bg-background border border-border rounded-bl-none shadow-sm"
                                            )}>
                                                {m.content}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-background border border-border rounded-2xl rounded-bl-none px-4 py-2 text-sm shadow-sm">
                                                <div className="flex gap-1">
                                                    <span className="animate-bounce">.</span>
                                                    <span className="animate-bounce delay-100">.</span>
                                                    <span className="animate-bounce delay-200">.</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 bg-background border-t border-border">
                                <form onSubmit={handleSend} className="flex w-full gap-2">
                                    <Input
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Ask about facials..."
                                        className="flex-1 focus-visible:ring-primary"
                                    />
                                    <Button type="submit" size="icon" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-accent transition-colors">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className={cn(
                    "fixed bottom-4 right-16 z-[40] h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-105",
                    isOpen ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                )}
            >
                <MessageCircle className="h-6 w-6" />
            </Button>
        </>
    );
}
