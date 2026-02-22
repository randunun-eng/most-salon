'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'admin';
    content: string;
}

import { usePathname } from 'next/navigation';

export default function AiBeautyChat() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Initialize Chat Session
    useEffect(() => {
        const storedChatId = localStorage.getItem('most_salon_chat_id');
        const storedClientId = localStorage.getItem('most_salon_client_id') || crypto.randomUUID();

        if (!localStorage.getItem('most_salon_client_id')) {
            localStorage.setItem('most_salon_client_id', storedClientId);
        }

        const fetchHistory = async () => {
            try {
                const params = new URLSearchParams();
                if (storedChatId) params.append('chatId', storedChatId);
                else params.append('clientId', storedClientId);

                const res = await fetch(`/api/chat?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.chatId) {
                        setChatId(data.chatId);
                        localStorage.setItem('most_salon_chat_id', data.chatId);
                    }
                    if (Array.isArray(data.messages)) {
                        setMessages(data.messages);
                    }
                }
            } catch (err) {
                console.error("Failed to load chat history", err);
            }
        };

        if (isOpen) {
            fetchHistory();
            // Start polling
            pollInterval.current = setInterval(fetchHistory, 5000);
        }

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const content = inputValue;
        const tempId = Date.now().toString();

        // Optimistic update
        setMessages(prev => [...prev, { id: tempId, role: 'user', content }]);
        setInputValue('');
        setIsLoading(true);

        try {
            const clientId = localStorage.getItem('most_salon_client_id');
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content }],
                    chatId,
                    clientId
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.chatId && !chatId) {
                    setChatId(data.chatId);
                    localStorage.setItem('most_salon_chat_id', data.chatId);
                }

                if (data.message) {
                    setMessages(prev => [...prev, data.message]);
                }
                // If status is 'waiting_for_agent', we just wait (polling will pick up agent/admin reply)
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (pathname?.startsWith('/admin')) return null;

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
                        <Card className="border-border shadow-2xl overflow-hidden glass-panel">
                            <CardHeader className="bg-neutral-900 text-white p-4 flex flex-row items-center justify-between border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    <span className="font-serif font-medium">The MOST Assistant</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 h-[400px] overflow-y-auto bg-neutral-950/90" ref={scrollRef}>
                                {messages.length === 0 && (
                                    <div className="text-center text-gray-400 mt-20 p-4">
                                        <p className="mb-2">✨ Welcome to The MOST.</p>
                                        <p className="text-xs">Ask me about services, prices, or book an appointment.</p>
                                    </div>
                                )}
                                <div className="flex flex-col gap-3">
                                    {messages.map(m => (
                                        <div key={m.id} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                                            <div className={cn(
                                                "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                                                m.role === 'user'
                                                    ? "bg-white text-black rounded-br-none"
                                                    : m.role === 'admin'
                                                        ? "bg-blue-600 text-white rounded-bl-none shadow-md border border-blue-500"
                                                        : "bg-neutral-800 text-gray-100 border border-neutral-700 rounded-bl-none"
                                            )}>
                                                {m.content}
                                                {m.role === 'admin' && <div className="text-[9px] opacity-70 mt-1 uppercase tracking-wider">Salon Team</div>}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                                                <div className="flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100" />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 bg-neutral-900 border-t border-white/10">
                                <form onSubmit={handleSend} className="flex w-full gap-2">
                                    <Input
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-neutral-800 border-neutral-700 text-white focus-visible:ring-1 focus-visible:ring-white/20 placeholder:text-gray-500"
                                    />
                                    <Button type="submit" size="icon" disabled={isLoading} className="bg-white text-black hover:bg-gray-200 transition-colors">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
                    "fixed bottom-6 right-6 z-[40] h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110",
                    isOpen ? "bg-neutral-900 text-white border border-white/10" : "bg-white text-black hover:bg-gray-100"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
            </Button>
        </>
    );
}

