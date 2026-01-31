import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai'; // We don't have a key, so we'll mock or use a custom "mock" provider if possible, or just return a string.
// Actually, for "mock logic", we can just return a stream of text without calling OpenAI.

export async function POST(req: Request) {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // Mock response logic
    let response = "I'm here to help you customizable your beauty experience at MOST. How can I assist you today?";

    if (lastMessage.content.toLowerCase().includes('facial')) {
        response = "For first-time visitors, I highly recommend our Hydra-Glow Facial. It's perfect for deep hydration and giving you that radiant 'glass skin' look. Would you like to book it?";
    } else if (lastMessage.content.toLowerCase().includes('wedding')) {
        response = "Congratulations! For weddings, our Bridal Makeup package is designed to look flawless in photos and last all day. We also recommend a trial session 2 weeks prior.";
    } else if (lastMessage.content.toLowerCase().includes('book')) {
        response = "You can easily book online by clicking the 'Book Now' button. Do you need help choosing a stylist?";
    }

    // Simulating a stream response (manual implementation for mock)
    // Since we use 'ai' sdk on client, it expects a stream.
    // We can use a simple text response for now or try to stream it.
    // For simplicity and "frontend only" requirement without keys, we can just return a json if useChat supports it, 
    // or use the 'streamText' with a dummy model if allowed. 
    // But easiest is to strictly mock the response body as a stream.

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const tokens = response.split(' ');
            for (const token of tokens) {
                controller.enqueue(encoder.encode(token + ' '));
                await new Promise(r => setTimeout(r, 50)); // simulate typing
            }
            controller.close();
        }
    });

    return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}
