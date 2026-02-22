
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, User, Phone, Bot, MessageSquare, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Chat, Message } from '@/lib/db-types';

export default function AdminChat() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [messages, setMessages] = useState<Message[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load & Polling for Chats List
    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await fetch('/api/admin/chat');
                if (res.ok) {
                    const data = await res.json();
                    setChats(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchChats();
        const interval = setInterval(fetchChats, 5000);
        return () => clearInterval(interval);
    }, []);

    // Load Messages for Selected Chat & Poll
    useEffect(() => {
        if (!selectedChatId) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/admin/chat?chatId=${selectedChatId}`);
                if (res.ok) {
                    const data = await res.json();
                    // The API returns { chatId, messages } so we need data.messages
                    setMessages(Array.isArray(data.messages) ? data.messages : []);
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Faster polling for active chat
        return () => clearInterval(interval);
    }, [selectedChatId]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleReply = async () => {
        if (!selectedChatId || !reply.trim()) return;

        try {
            const res = await fetch('/api/admin/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reply',
                    chatId: selectedChatId,
                    content: reply
                })
            });

            if (res.ok) {
                const newMsg = await res.json();
                setMessages(prev => [...prev, newMsg]);
                setReply('');

                // Pause AI if admin replies
                updateAiStatus(selectedChatId, false);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const updateAiStatus = async (chatId: string, status: boolean) => {
        try {
            const res = await fetch('/api/admin/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'toggle_ai',
                    chatId,
                    aiStatus: status
                })
            });

            if (res.ok) {
                setChats(prev => prev.map(c =>
                    c.id === chatId ? { ...c, ai_status: status ? 1 : 0 } : c
                ));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const selectedChat = chats.find(c => c.id === selectedChatId);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            {/* Sidebar: Chat List */}
            <Card className={cn("!bg-neutral-900 border !border-neutral-800 md:col-span-1 overflow-hidden flex flex-col", mobileView === 'chat' ? 'hidden md:flex' : 'flex')}>
                <CardHeader className="p-4 border-b !border-neutral-800">
                    <CardTitle className="!text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        Inbox
                        <Badge variant="secondary" className="ml-auto bg-neutral-800 text-gray-400">
                            {chats.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {Array.isArray(chats) && chats.length === 0 && (
                        <div className="text-gray-500 text-center py-10 text-sm">No active chats</div>
                    )}
                    {Array.isArray(chats) && chats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => { setSelectedChatId(chat.id); setMobileView('chat'); }}
                            className={cn(
                                "p-3 rounded-lg cursor-pointer transition-colors border text-left",
                                selectedChatId === chat.id
                                    ? "bg-neutral-800 border-neutral-700"
                                    : "border-transparent hover:bg-neutral-800/50"
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn("font-semibold text-sm", chat.client_name ? "!text-white" : "text-gray-400 italic")}>
                                    {chat.client_name || 'Guest User'}
                                </span>
                                <span className="text-[10px] text-gray-600">
                                    {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {chat.client_phone && (
                                <div className="flex items-center gap-1 text-[11px] text-blue-400 mb-1">
                                    <Phone className="w-3 h-3" /> {chat.client_phone}
                                </div>
                            )}
                            <div className="flex justify-between items-center mt-2">
                                <Badge variant="outline" className={cn("text-[8px] py-0 h-4 border-none", chat.ai_status ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                    {chat.ai_status ? 'AI ON' : 'PAUSED'}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Chat Window */}
            <Card className={cn("!bg-neutral-900 border !border-neutral-800 md:col-span-2 overflow-hidden flex flex-col", mobileView === 'list' ? 'hidden md:flex' : 'flex')}>
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b !border-neutral-800 flex items-center justify-between bg-neutral-900 z-10">
                            <div className="flex items-center gap-3">
                                <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMobileView('list')}>
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                <h3 className="font-bold !text-white flex items-center gap-2">
                                    {selectedChat.client_name || 'Guest'}
                                    {selectedChat.client_phone && <span className="text-sm font-normal text-gray-400">({selectedChat.client_phone})</span>}
                                </h3>
                                <p className="text-[10px] text-gray-500">ID: {selectedChat.client_id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Label className="text-xs text-gray-400">AI Auto-Reply</Label>
                                <Switch
                                    checked={!!selectedChat.ai_status}
                                    onCheckedChange={(checked) => updateAiStatus(selectedChat.id, checked)}
                                    className="data-[state=checked]:bg-green-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20" ref={scrollRef}>
                            {Array.isArray(messages) && messages.map(m => (
                                <div key={m.id} className={cn("flex", m.role === 'admin' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                                        m.role === 'admin'
                                            ? "bg-blue-600 text-white rounded-br-none"
                                            : m.role === 'assistant'
                                                ? "bg-neutral-800 text-gray-200 border border-neutral-700"
                                                : "bg-white text-black rounded-bl-none"
                                    )}>
                                        {m.content}
                                        <div className="text-[9px] opacity-50 mt-1 flex justify-between items-center gap-4">
                                            <span className="uppercase tracking-wider">{m.role}</span>
                                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-neutral-900 border-t !border-neutral-800">
                            <div className="flex gap-2">
                                <Input
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    placeholder="Type a reply..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                                    className="!bg-neutral-800 !border-neutral-700 !text-white"
                                />
                                <Button onClick={handleReply} size="icon" className="bg-white text-black hover:bg-gray-200">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 text-center">
                                Replying will automatically pause AI for this chat.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select a chat to view conversation</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
